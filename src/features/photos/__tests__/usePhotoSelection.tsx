import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Paths } from "expo-file-system";
import * as ExpoImageManipulator from "expo-image-manipulator";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import omit from "lodash/omit";
import { useState } from "react";
import { Alert, Linking } from "react-native";
import { createStructuredError } from "@/lib/errors";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider, useSettings } from "@/state/settings";
import type { LogPhoto } from "@/types";
import { usePhotoSelection } from "../hooks/usePhotoSelection";
import { setPhotoSourceOverride } from "../photoSource";
import type {
  LibraryPermission,
  LibraryPhoto,
  PickedPhoto,
} from "../photoSource";
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

// Library photo ids and URIs; their files import from the cache.
const LIBRARY: LibraryPhoto[] = ["a", "b", "c", "d"].map((id) => ({
  id: `library-${id}`,
  uri: `ph://library-${id}`,
}));

const getLibraryFileUri = (id: string) => `${Paths.cache.uri}${id}.jpg`;

const createPicked = (name: string): PickedPhoto => {
  const uri = `${Paths.cache.uri}${name}.jpg`;
  __setImageSize({ uri, width: 1200, height: 1600 });
  return { uri, width: 1200, height: 1600 };
};

const createStoredPhoto = (
  index: number,
  overrides: Partial<LogPhoto> = {}
): LogPhoto => ({
  id: `stored-${index}`,
  fileName: `stored-${index}.jpg`,
  width: 100,
  height: 100,
  createdAt: "2026-01-01T00:00:00.000Z",
  source: "library",
  ...overrides,
});

const source = {
  pickFromLibrary: jest.fn<Promise<PickedPhoto[]>, [{ limit: number }]>(),
  takePhoto: jest.fn<Promise<PickedPhoto | null>, []>(),
  getLibraryPermission: jest.fn<Promise<LibraryPermission>, []>(),
  requestLibraryPermission: jest.fn<Promise<LibraryPermission>, []>(),
  manageLibraryAccess: jest.fn(() => Promise.resolve()),
  addLibraryListener: jest.fn(() => () => {}),
  listPhotosOnDate: jest.fn((_options: { date: string }) =>
    Promise.resolve(LIBRARY)
  ),
  getLibraryPhotoUri: jest.fn(({ photo }: { photo: LibraryPhoto }) =>
    Promise.resolve(getLibraryFileUri(photo.id))
  ),
};

const renderSelection = async ({
  initialPhotos = [],
  isActive = true,
}: {
  initialPhotos?: LogPhoto[];
  isActive?: boolean;
} = {}) => {
  const hook = await renderHook(
    ({ active }: { active: boolean }) => {
      const [photos, setPhotos] = useState(initialPhotos);
      return {
        photos,
        selection: usePhotoSelection({
          date: DATE,
          photos,
          onChange: setPhotos,
          mode: "create",
          isActive: active,
        }),
        settings: useSettings().settings,
      };
    },
    { wrapper, initialProps: { active: isActive } }
  );
  await waitFor(() => {
    expect(hook.result.current.settings.loaded).toBe(true);
  });
  if (isActive) {
    await waitFor(() => {
      expect(hook.result.current.selection.permission).not.toBeNull();
    });
  }
  return hook;
};

type Hook = Awaited<ReturnType<typeof renderSelection>>;

const renderWithDayPhotos = async (
  options: Parameters<typeof renderSelection>[0] = {}
) => {
  source.getLibraryPermission.mockResolvedValue("granted");
  const hook = await renderSelection(options);
  await waitFor(() => {
    expect(
      hook.result.current.selection.tiles.filter(({ key }) =>
        key.startsWith("day:")
      )
    ).toHaveLength(LIBRARY.length);
  });
  return hook;
};

const getTile = (hook: Hook, key: string) => {
  const tile = hook.result.current.selection.tiles.find(
    (candidate) => candidate.key === key
  );
  if (!tile) {
    throw createStructuredError({
      status: "test_tile_missing",
      message: `Tile ${key} is not in the grid`,
      why: "The selection hook did not render the expected tile",
      fix: "Check the tile key and the mocked photo source",
    });
  }
  return tile;
};

const tap = async (hook: Hook, key: string) => {
  await act(() => {
    hook.result.current.selection.toggle(getTile(hook, key));
  });
};

const waitForImports = (hook: Hook) =>
  waitFor(() => {
    expect(
      hook.result.current.selection.tiles.some(({ isImporting }) => isImporting)
    ).toBe(false);
  });

const getTrackedEvents = () =>
  jest
    .mocked(mockCapture)
    .mock.calls.filter(([event]) => String(event).startsWith("photos:"));

// Keys that would leak photo content or device data.
const FORBIDDEN_KEYS = [
  "uri",
  "fileName",
  "file_name",
  "width",
  "height",
  "exif",
  "location",
  "createdAt",
  "created_at",
  "libraryId",
  "library_id",
  "date",
];

const SUPER_PROPERTIES = ["steps", "scale_type", "reminder_enabled"];

const _console_error = console.error;

describe("usePhotoSelection()", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    __resetImageSizes();
    for (const photo of LIBRARY) {
      __setImageSize({
        uri: getLibraryFileUri(photo.id),
        width: 3024,
        height: 4032,
      });
    }
    source.getLibraryPermission.mockResolvedValue("undetermined");
    source.requestLibraryPermission.mockResolvedValue("granted");
    await AsyncStorage.clear();
    setPhotoSourceOverride(source);
    console.error = jest.fn();
  });

  afterEach(() => {
    setPhotoSourceOverride(null);
    console.error = _console_error;
  });

  describe("permission row", () => {
    test("undetermined: shows the row, never asks on mount", async () => {
      const hook = await renderSelection();

      expect(hook.result.current.selection.permission).toBe("undetermined");
      expect(hook.result.current.selection.isDayAccessPromptVisible).toBe(true);
      expect(hook.result.current.selection.isDayAccessMenuVisible).toBe(false);
      expect(source.requestLibraryPermission).not.toHaveBeenCalled();
      expect(source.listPhotosOnDate).not.toHaveBeenCalled();
      expect(getTrackedEvents()).toEqual([
        [
          "photos:day_access_prompt_shown",
          expect.objectContaining({
            mode: "create",
            entry_days_ago: expect.any(Number),
          }),
        ],
      ]);
    });

    test("waits for the step to show before reading the library", async () => {
      const hook = await renderSelection({ isActive: false });

      expect(source.getLibraryPermission).not.toHaveBeenCalled();
      expect(hook.result.current.selection.permission).toBeNull();

      await hook.rerender({ active: true });
      await waitFor(() => {
        expect(hook.result.current.selection.permission).toBe("undetermined");
      });
    });

    test("dismissed: hides the row for good, offers access in the add menu", async () => {
      const hook = await renderSelection();

      await act(() => {
        hook.result.current.selection.dismissDayAccess();
      });

      expect(hook.result.current.settings.photosDayAccessDismissed).toBe(true);
      expect(hook.result.current.selection.isDayAccessPromptVisible).toBe(
        false
      );
      expect(hook.result.current.selection.isDayAccessMenuVisible).toBe(true);
      expect(getTrackedEvents()).toContainEqual([
        "photos:day_access_prompt_dismissed",
        expect.objectContaining({ mode: "create" }),
      ]);
    });

    test("denied: hides the row and the menu option for good", async () => {
      source.requestLibraryPermission.mockResolvedValue("denied");
      const hook = await renderSelection();

      await act(() =>
        hook.result.current.selection.allowDayAccess({ source: "row" })
      );

      expect(hook.result.current.selection.permission).toBe("denied");
      expect(hook.result.current.selection.isDayAccessPromptVisible).toBe(
        false
      );
      expect(hook.result.current.selection.isDayAccessMenuVisible).toBe(false);
      expect(hook.result.current.settings.photosDayAccessDismissed).toBe(true);
      expect(getTrackedEvents()).toContainEqual([
        "photos:day_access_answered",
        expect.objectContaining({ status: "denied", source: "row" }),
      ]);
    });

    test("granted after Allow: loads photos of the entry's day", async () => {
      const hook = await renderSelection();

      await act(() =>
        hook.result.current.selection.allowDayAccess({ source: "menu" })
      );
      await waitFor(() => {
        expect(hook.result.current.selection.tiles).toHaveLength(
          LIBRARY.length
        );
      });

      expect(source.listPhotosOnDate).toHaveBeenCalledWith({ date: DATE });
      expect(hook.result.current.selection.isDayAccessPromptVisible).toBe(
        false
      );
      expect(getTrackedEvents()).toEqual(
        expect.arrayContaining([
          [
            "photos:day_access_answered",
            expect.objectContaining({ status: "granted", source: "menu" }),
          ],
          [
            "photos:day_photos_loaded",
            expect.objectContaining({ count: 4, access: "granted" }),
          ],
        ])
      );
    });

    test("limited: shows the accessible day photos", async () => {
      source.getLibraryPermission.mockResolvedValue("limited");
      const hook = await renderSelection();

      await waitFor(() => {
        expect(hook.result.current.selection.tiles).toHaveLength(
          LIBRARY.length
        );
      });
      expect(hook.result.current.selection.permission).toBe("limited");
      expect(hook.result.current.selection.isDayAccessPromptVisible).toBe(
        false
      );
      expect(getTrackedEvents()).toContainEqual([
        "photos:day_photos_loaded",
        expect.objectContaining({ access: "limited" }),
      ]);
    });

    test("unavailable (Android): no row, no menu option, no library query", async () => {
      source.getLibraryPermission.mockResolvedValue("unavailable");
      const hook = await renderSelection();

      expect(hook.result.current.selection.isDayAccessPromptVisible).toBe(
        false
      );
      expect(hook.result.current.selection.isDayAccessMenuVisible).toBe(false);
      expect(source.listPhotosOnDate).not.toHaveBeenCalled();
    });
  });

  describe("selection", () => {
    test("one count across day, library, and camera photos", async () => {
      source.pickFromLibrary.mockResolvedValueOnce([createPicked("picked")]);
      source.takePhoto.mockResolvedValueOnce(createPicked("camera"));
      const hook = await renderWithDayPhotos();

      await tap(hook, "day:library-a");
      await tap(hook, "day:library-b");
      // Counts at tap time, before the import finishes.
      expect(hook.result.current.selection.selectedCount).toBe(2);

      await act(() => hook.result.current.selection.addFromLibrary());
      await act(() => hook.result.current.selection.addFromCamera());
      expect(hook.result.current.selection.selectedCount).toBe(4);
      await waitForImports(hook);

      const { photos } = hook.result.current;
      expect(photos.map(({ source: kind }) => kind).sort()).toEqual([
        "camera",
        "day",
        "day",
        "library",
      ]);
      expect(
        photos
          .filter(({ libraryId }) => libraryId)
          .map(({ libraryId }) => libraryId)
      ).toEqual(["library-a", "library-b"]);
      expect(hook.result.current.selection.selectedCount).toBe(4);
      // Order: picked newest first, then day photos.
      expect(
        hook.result.current.selection.tiles.map(({ source: kind }) => kind)
      ).toEqual(["camera", "library", "day", "day", "day", "day"]);
    });

    test("imports selected tiles one at a time", async () => {
      const hook = await renderWithDayPhotos();
      const firstUri = Promise.withResolvers<string>();
      source.getLibraryPhotoUri.mockImplementationOnce(() => firstUri.promise);

      await tap(hook, "day:library-a");
      await tap(hook, "day:library-b");

      expect(source.getLibraryPhotoUri).toHaveBeenCalledTimes(1);
      expect(getTile(hook, "day:library-b").isImporting).toBe(true);

      await act(async () => {
        firstUri.resolve(getLibraryFileUri("library-a"));
        await firstUri.promise;
      });
      await waitForImports(hook);
      expect(source.getLibraryPhotoUri).toHaveBeenCalledTimes(2);
      expect(hook.result.current.photos).toHaveLength(2);
    });

    test("deselect keeps the tile; a second tap adds it back without import", async () => {
      source.pickFromLibrary.mockResolvedValueOnce([createPicked("picked")]);
      const hook = await renderWithDayPhotos();
      await act(() => hook.result.current.selection.addFromLibrary());
      await waitForImports(hook);
      const [pickedTile] = hook.result.current.selection.tiles;
      expect(pickedTile.isSelected).toBe(true);

      await tap(hook, pickedTile.key);
      expect(hook.result.current.photos).toEqual([]);
      expect(getTile(hook, pickedTile.key).isSelected).toBe(false);

      await tap(hook, pickedTile.key);
      expect(hook.result.current.photos).toEqual([pickedTile.photo]);
      expect(
        jest.mocked(ExpoImageManipulator.ImageManipulator.manipulate)
      ).toHaveBeenCalledTimes(1);
    });

    test("a failed import deselects the tile and alerts", async () => {
      source.getLibraryPhotoUri.mockRejectedValueOnce(new Error("iCloud off"));
      const hook = await renderWithDayPhotos();

      await tap(hook, "day:library-a");
      await waitForImports(hook);

      expect(getTile(hook, "day:library-a").isSelected).toBe(false);
      expect(hook.result.current.selection.selectedCount).toBe(0);
      expect(hook.result.current.photos).toEqual([]);
      expect(Alert.alert).toHaveBeenCalledWith(
        "Photo could not be added. Try again or pick another photo."
      );
      expect(getTrackedEvents()).toContainEqual([
        "photos:import_failed",
        expect.objectContaining({
          source: "day",
          status: "photo_import_failed",
        }),
      ]);
    });

    test(`stops at ${MAX_PHOTOS_PER_ENTRY}: tap alerts, picker never opens`, async () => {
      const hook = await renderWithDayPhotos({
        initialPhotos: [1, 2, 3, 4].map((index) => createStoredPhoto(index)),
      });

      await tap(hook, "day:library-a");
      await tap(hook, "day:library-b");
      expect(hook.result.current.selection.isFull).toBe(true);

      await tap(hook, "day:library-c");
      await act(() => hook.result.current.selection.addFromLibrary());

      expect(hook.result.current.selection.selectedCount).toBe(
        MAX_PHOTOS_PER_ENTRY
      );
      expect(getTile(hook, "day:library-c").isSelected).toBe(false);
      expect(source.pickFromLibrary).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith("Up to 6 photos per entry");
      expect(
        getTrackedEvents().filter(([event]) => event === "photos:limit_reached")
      ).toEqual([
        ["photos:limit_reached", expect.objectContaining({ mode: "create" })],
        ["photos:limit_reached", expect.objectContaining({ mode: "create" })],
      ]);
    });

    test("passes the remaining count to the picker", async () => {
      source.pickFromLibrary.mockResolvedValueOnce([]);
      const hook = await renderSelection({
        initialPhotos: [createStoredPhoto(1), createStoredPhoto(2)],
      });

      await act(() => hook.result.current.selection.addFromLibrary());

      expect(source.pickFromLibrary).toHaveBeenCalledWith({ limit: 4 });
      expect(getTrackedEvents()).toEqual(
        expect.arrayContaining([
          [
            "photos:picker_opened",
            expect.objectContaining({ source: "library", remaining: 4 }),
          ],
          [
            "photos:picker_closed",
            expect.objectContaining({
              source: "library",
              picked_count: 0,
              is_cancelled: true,
            }),
          ],
        ])
      );
    });

    test("offers settings when camera access is denied", async () => {
      jest.spyOn(Linking, "openSettings").mockResolvedValueOnce();
      source.takePhoto.mockRejectedValueOnce(
        createStructuredError({
          status: "photo_camera_denied",
          message: "Camera is not available",
          why: "Denied in test",
          fix: "Allow camera access",
        })
      );
      const hook = await renderSelection();

      await act(() => hook.result.current.selection.addFromCamera());

      expect(hook.result.current.photos).toEqual([]);
      expect(getTrackedEvents()).toContainEqual([
        "photos:camera_access_denied",
        expect.anything(),
      ]);
      const [[title, , buttons]] = jest.mocked(Alert.alert).mock.calls;
      expect(title).toBe("Camera access needed");
      buttons?.[1]?.onPress?.();
      expect(Linking.openSettings).toHaveBeenCalled();
    });
  });

  describe("dedupe by libraryId", () => {
    test("a stored day photo shows once, as the selected day tile", async () => {
      const stored = createStoredPhoto(1, {
        source: "day",
        libraryId: "library-b",
      });
      const hook = await renderWithDayPhotos({ initialPhotos: [stored] });

      const { tiles } = hook.result.current.selection;
      expect(tiles).toHaveLength(LIBRARY.length);
      expect(getTile(hook, "day:library-b")).toMatchObject({
        isSelected: true,
        photo: stored,
      });
      expect(hook.result.current.selection.selectedCount).toBe(1);

      // Deselect and select again: same stored photo, no second import.
      await tap(hook, "day:library-b");
      await tap(hook, "day:library-b");
      expect(hook.result.current.photos).toEqual([stored]);
      expect(source.getLibraryPhotoUri).not.toHaveBeenCalled();
    });

    test("a stored day photo missing from the day list stays as an added tile", async () => {
      const stored = createStoredPhoto(1, {
        source: "day",
        libraryId: "library-gone",
      });
      const hook = await renderWithDayPhotos({ initialPhotos: [stored] });

      expect(hook.result.current.selection.tiles[0]).toMatchObject({
        key: "photo:stored-1",
        isSelected: true,
      });
      expect(hook.result.current.selection.tiles).toHaveLength(
        LIBRARY.length + 1
      );
    });
  });

  test("analytics payloads hold counts and enums only", async () => {
    source.pickFromLibrary.mockResolvedValueOnce([createPicked("picked")]);
    const hook = await renderSelection();
    await act(() =>
      hook.result.current.selection.allowDayAccess({ source: "row" })
    );
    await waitFor(() => {
      expect(hook.result.current.selection.tiles).toHaveLength(LIBRARY.length);
    });
    await tap(hook, "day:library-a");
    await act(() => hook.result.current.selection.addFromLibrary());
    await waitForImports(hook);
    await tap(hook, "day:library-a");

    const events = getTrackedEvents();
    expect(events.map(([event]) => event)).toEqual(
      expect.arrayContaining([
        "photos:day_access_prompt_shown",
        "photos:day_access_answered",
        "photos:day_photos_loaded",
        "photos:photo_selected",
        "photos:picker_opened",
        "photos:picker_closed",
        "photos:photo_deselected",
      ])
    );
    for (const [, properties] of events) {
      for (const key of FORBIDDEN_KEYS) {
        expect(properties ?? {}).not.toHaveProperty(key);
      }
      // Super properties (`steps`, `scale_type`, `reminder_enabled`) ride on
      // every event; check the event's own properties.
      const own = omit(properties ?? {}, SUPER_PROPERTIES);
      for (const value of Object.values(own)) {
        // Primitives only: no nested objects or arrays.
        expect(value instanceof Object).toBe(false);
        expect(String(value)).not.toContain("library-");
        expect(String(value)).not.toContain("://");
      }
    }
  });
});
