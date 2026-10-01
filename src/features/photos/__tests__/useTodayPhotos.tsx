import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Paths } from "expo-file-system";
import * as ExpoImageManipulator from "expo-image-manipulator";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { useState } from "react";
import { Alert } from "react-native";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider, useSettings } from "@/state/settings";
import type { LogPhoto } from "@/types";
import { useTodayPhotos } from "../hooks/useTodayPhotos";
import { setPhotoSourceOverride } from "../photoSource";
import type { LibraryPermission, LibraryPhoto } from "../photoSource";
import { MAX_PHOTOS_PER_ENTRY } from "../storage";

// Helpers of the manual mock in src/__mocks__/expo-image-manipulator.js.
const { __setImageSize, __resetImageSizes } =
  // SAFETY: Jest resolves this import to the manual mock, which adds the helpers.
  ExpoImageManipulator as typeof ExpoImageManipulator & {
    __setImageSize: (image: {
      uri: string;
      width: number;
      height: number;
    }) => void;
    __resetImageSizes: () => void;
  };

const { capture: mockCapture } = getPostHogTestClient();

const wrapper = ({ children }) => (
  <SettingsProvider>
    <AnalyticsProvider options={{ enabled: true }}>
      {children}
    </AnalyticsProvider>
  </SettingsProvider>
);

const DATE = "2026-10-02";

const LIBRARY: LibraryPhoto[] = ["a", "b", "c"].map((id) => ({
  id,
  uri: `ph://${id}`,
}));

const getFileUri = (id: string) => `${Paths.cache.uri}library-${id}.jpg`;

const createStoredPhoto = (index: number): LogPhoto => ({
  id: `stored-${index}`,
  fileName: `stored-${index}.jpg`,
  width: 100,
  height: 100,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const source = {
  pickFromLibrary: jest.fn(),
  takePhoto: jest.fn(),
  getLibraryPermission: jest.fn<Promise<LibraryPermission>, []>(),
  requestLibraryPermission: jest.fn<Promise<LibraryPermission>, []>(),
  manageLibraryAccess: jest.fn(() => Promise.resolve()),
  addLibraryListener: jest.fn(() => () => {}),
  listPhotosOnDate: jest.fn((_options: { date: string }) =>
    Promise.resolve(LIBRARY)
  ),
  getLibraryPhotoUri: jest.fn(({ photo }: { photo: LibraryPhoto }) =>
    Promise.resolve(getFileUri(photo.id))
  ),
};

const renderTodayPhotos = async ({
  initialPhotos = [],
}: {
  initialPhotos?: LogPhoto[];
} = {}) => {
  const hook = await renderHook(
    () => {
      const [photos, setPhotos] = useState(initialPhotos);
      return {
        photos,
        today: useTodayPhotos({
          date: DATE,
          photos,
          onChange: setPhotos,
          mode: "create",
        }),
        settings: useSettings().settings,
      };
    },
    { wrapper }
  );
  await waitFor(() => {
    expect(hook.result.current.settings.loaded).toBe(true);
    expect(hook.result.current.today.permission).not.toBeNull();
  });
  return hook;
};

const renderWithLibrary = async (
  options: Parameters<typeof renderTodayPhotos>[0] = {}
) => {
  source.getLibraryPermission.mockResolvedValue("granted");
  const hook = await renderTodayPhotos(options);
  await waitFor(() => {
    expect(hook.result.current.today.photos).toEqual(LIBRARY);
  });
  return hook;
};

const PHOTO_EVENTS = new Set([
  "logger:photo_added",
  "logger:photo_removed",
  "logger:photo_limit_reached",
  "logger:library_permission_answered",
]);

const getTrackedEvents = () =>
  jest
    .mocked(mockCapture)
    .mock.calls.filter(([event]) => PHOTO_EVENTS.has(String(event)));

describe("useTodayPhotos()", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    __resetImageSizes();
    for (const { id } of LIBRARY) {
      __setImageSize({ uri: getFileUri(id), width: 1200, height: 1600 });
    }
    await AsyncStorage.clear();
    setPhotoSourceOverride(source);
  });

  afterEach(() => {
    setPhotoSourceOverride(null);
  });

  test("reads the permission on mount but never asks", async () => {
    source.getLibraryPermission.mockResolvedValue("undetermined");

    const hook = await renderTodayPhotos();

    expect(hook.result.current.today.permission).toBe("undetermined");
    expect(source.requestLibraryPermission).not.toHaveBeenCalled();
    expect(source.listPhotosOnDate).not.toHaveBeenCalled();
  });

  test("lists photos of the entry's day after the user allows access", async () => {
    source.getLibraryPermission.mockResolvedValue("undetermined");
    source.requestLibraryPermission.mockResolvedValueOnce("limited");
    const hook = await renderTodayPhotos();

    await act(() => hook.result.current.today.allow());

    await waitFor(() => {
      expect(hook.result.current.today.photos).toEqual(LIBRARY);
    });
    expect(hook.result.current.today.permission).toBe("limited");
    expect(source.listPhotosOnDate).toHaveBeenCalledWith({ date: DATE });
    expect(getTrackedEvents()).toEqual([
      [
        "logger:library_permission_answered",
        expect.objectContaining({ status: "limited" }),
      ],
    ]);
  });

  test("imports selected photos in one batch, deselect removes them", async () => {
    const hook = await renderWithLibrary();

    await act(() => {
      hook.result.current.today.toggle(LIBRARY[0]);
    });
    await act(() => {
      hook.result.current.today.toggle(LIBRARY[1]);
    });

    // Selected at once, imported after the debounce.
    expect([...hook.result.current.today.selectedIds]).toEqual(["a", "b"]);
    expect(hook.result.current.photos).toEqual([]);
    await waitFor(() => {
      expect(hook.result.current.photos).toHaveLength(2);
    });
    expect(source.getLibraryPhotoUri).toHaveBeenCalledTimes(2);
    expect(getTrackedEvents()).toEqual([
      [
        "logger:photo_added",
        expect.objectContaining({
          source: "today",
          photos_count: 2,
          mode: "create",
        }),
      ],
    ]);

    await act(() => {
      hook.result.current.today.toggle(LIBRARY[0]);
    });

    expect(hook.result.current.photos).toHaveLength(1);
    expect([...hook.result.current.today.selectedIds]).toEqual(["b"]);
  });

  test("a photo deselected before the debounce ends is not imported", async () => {
    const hook = await renderWithLibrary();

    await act(() => {
      hook.result.current.today.toggle(LIBRARY[0]);
    });
    await act(() => {
      hook.result.current.today.toggle(LIBRARY[0]);
    });
    await act(() => {
      hook.result.current.today.toggle(LIBRARY[1]);
    });

    await waitFor(() => {
      expect(hook.result.current.photos).toHaveLength(1);
    });
    expect(source.getLibraryPhotoUri).toHaveBeenCalledTimes(1);
    expect([...hook.result.current.today.selectedIds]).toEqual(["b"]);
  });

  test("selected photos count toward the limit", async () => {
    const hook = await renderWithLibrary({
      initialPhotos: Array.from(
        { length: MAX_PHOTOS_PER_ENTRY - 1 },
        (_, index) => createStoredPhoto(index)
      ),
    });

    await act(() => {
      hook.result.current.today.toggle(LIBRARY[0]);
    });
    await act(() => {
      hook.result.current.today.toggle(LIBRARY[1]);
    });

    expect([...hook.result.current.today.selectedIds]).toEqual(["a"]);
    expect(Alert.alert).toHaveBeenCalledWith("Up to 6 photos per entry");
    await waitFor(() => {
      expect(hook.result.current.photos).toHaveLength(MAX_PHOTOS_PER_ENTRY);
    });
  });

  // Last test: a denial lasts until the app restarts, so it changes the
  // module state the other tests start from.
  test("a denial hides the card until the app restarts", async () => {
    source.getLibraryPermission.mockResolvedValue("undetermined");
    source.requestLibraryPermission.mockResolvedValueOnce("undetermined");
    const hook = await renderTodayPhotos();

    await act(() => hook.result.current.today.allow());

    expect(hook.result.current.today.permission).toBe("denied");
    expect(source.listPhotosOnDate).not.toHaveBeenCalled();
    expect(getTrackedEvents()).toEqual([
      [
        "logger:library_permission_answered",
        expect.objectContaining({ status: "denied" }),
      ],
    ]);

    // Android can ask again after one refusal; the next logger still hides
    // the card.
    await hook.unmount();
    const next = await renderTodayPhotos();
    expect(next.result.current.today.permission).toBe("denied");
  });
});
