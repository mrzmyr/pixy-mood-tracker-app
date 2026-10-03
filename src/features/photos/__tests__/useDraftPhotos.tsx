import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Paths } from "expo-file-system";
import * as ExpoImageManipulator from "expo-image-manipulator";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import omit from "lodash/omit";
import { useState } from "react";
import { Alert } from "react-native";
import { createStructuredError } from "@/lib/errors";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider, useSettings } from "@/state/settings";
import type { LogPhoto } from "@/types";
import { useDraftPhotos } from "../hooks/useDraftPhotos";
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

const renderDraft = async ({
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
        draft: useDraftPhotos({
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
      expect(hook.result.current.draft.permission).not.toBeNull();
    });
  }
  return hook;
};

type Hook = Awaited<ReturnType<typeof renderDraft>>;

const renderWithDayPhotos = async (
  options: Parameters<typeof renderDraft>[0] = {}
) => {
  source.getLibraryPermission.mockResolvedValue("granted");
  const hook = await renderDraft(options);
  await waitFor(() => {
    expect(hook.result.current.draft.suggestions.length).toBeGreaterThan(0);
  });
  return hook;
};

const getSuggestion = (hook: Hook, id: string) => {
  const suggestion = hook.result.current.draft.suggestions.find(
    (candidate) => candidate.id === id
  );
  if (!suggestion) {
    throw createStructuredError({
      status: "test_suggestion_missing",
      message: `Suggestion ${id} is not offered`,
      why: "The draft photos hook did not offer the expected library photo",
      fix: "Check the library photo id and the mocked photo source",
    });
  }
  return suggestion;
};

const getSuggestionIds = (hook: Hook) =>
  hook.result.current.draft.suggestions.map(({ id }) => id);

const addSuggestion = async (hook: Hook, id: string) => {
  const suggestion = getSuggestion(hook, id);
  await act(() => {
    hook.result.current.draft.addSuggestion(suggestion);
  });
};

const remove = async (hook: Hook, index: number) => {
  await act(() => {
    hook.result.current.draft.remove(hook.result.current.draft.photos[index]);
  });
};

const waitForImports = (hook: Hook) =>
  waitFor(() => {
    expect(
      hook.result.current.draft.photos.some(({ isImporting }) => isImporting)
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

describe("useDraftPhotos()", () => {
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
      const hook = await renderDraft();

      expect(hook.result.current.draft.permission).toBe("undetermined");
      expect(hook.result.current.draft.isDayAccessPromptVisible).toBe(true);
      expect(hook.result.current.draft.isDayAccessButtonVisible).toBe(false);
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
      const hook = await renderDraft({ isActive: false });

      expect(source.getLibraryPermission).not.toHaveBeenCalled();
      expect(hook.result.current.draft.permission).toBeNull();

      await hook.rerender({ active: true });
      await waitFor(() => {
        expect(hook.result.current.draft.permission).toBe("undetermined");
      });
    });

    test("dismissed: hides the row for good, offers the button", async () => {
      const hook = await renderDraft();

      await act(() => {
        hook.result.current.draft.dismissDayAccess();
      });

      expect(hook.result.current.settings.photosDayAccessDismissed).toBe(true);
      expect(hook.result.current.draft.isDayAccessPromptVisible).toBe(false);
      expect(hook.result.current.draft.isDayAccessButtonVisible).toBe(true);
      expect(getTrackedEvents()).toContainEqual([
        "photos:day_access_prompt_dismissed",
        expect.objectContaining({ mode: "create" }),
      ]);
    });

    test("denied: hides the row and the button for good", async () => {
      source.requestLibraryPermission.mockResolvedValue("denied");
      const hook = await renderDraft();

      await act(() =>
        hook.result.current.draft.allowDayAccess({ source: "row" })
      );

      expect(hook.result.current.draft.permission).toBe("denied");
      expect(hook.result.current.draft.isDayAccessPromptVisible).toBe(false);
      expect(hook.result.current.draft.isDayAccessButtonVisible).toBe(false);
      expect(hook.result.current.settings.photosDayAccessDismissed).toBe(true);
      expect(getTrackedEvents()).toContainEqual([
        "photos:day_access_answered",
        expect.objectContaining({ status: "denied", source: "row" }),
      ]);
    });

    test("granted after Allow: loads photos of the entry's day", async () => {
      const hook = await renderDraft();

      await act(() =>
        hook.result.current.draft.allowDayAccess({ source: "button" })
      );
      await waitFor(() => {
        expect(hook.result.current.draft.suggestions).toHaveLength(
          LIBRARY.length
        );
      });

      expect(source.listPhotosOnDate).toHaveBeenCalledWith({ date: DATE });
      expect(hook.result.current.draft.isDayAccessPromptVisible).toBe(false);
      expect(getTrackedEvents()).toEqual(
        expect.arrayContaining([
          [
            "photos:day_access_answered",
            expect.objectContaining({ status: "granted", source: "button" }),
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
      const hook = await renderDraft();

      await waitFor(() => {
        expect(hook.result.current.draft.suggestions).toHaveLength(
          LIBRARY.length
        );
      });
      expect(hook.result.current.draft.permission).toBe("limited");
      expect(hook.result.current.draft.isDayAccessPromptVisible).toBe(false);
      expect(getTrackedEvents()).toContainEqual([
        "photos:day_photos_loaded",
        expect.objectContaining({ access: "limited" }),
      ]);
    });

    test("unavailable (Android): no row, no button, no library query", async () => {
      source.getLibraryPermission.mockResolvedValue("unavailable");
      const hook = await renderDraft();

      expect(hook.result.current.draft.isDayAccessPromptVisible).toBe(false);
      expect(hook.result.current.draft.isDayAccessButtonVisible).toBe(false);
      expect(source.listPhotosOnDate).not.toHaveBeenCalled();
    });
  });

  describe("add and remove", () => {
    test("photos attach at once and import one at a time", async () => {
      const firstUri = Promise.withResolvers<string>();
      source.getLibraryPhotoUri.mockImplementationOnce(() => firstUri.promise);
      const hook = await renderWithDayPhotos();

      await addSuggestion(hook, "library-a");
      await addSuggestion(hook, "library-b");

      // Counted before the files exist; the add tile waits.
      expect(hook.result.current.draft.count).toBe(2);
      expect(
        hook.result.current.draft.photos.map(({ isImporting }) => isImporting)
      ).toEqual([true, true]);
      expect(hook.result.current.draft.isAddDisabled).toBe(true);
      expect(source.getLibraryPhotoUri).toHaveBeenCalledTimes(1);

      const keys = hook.result.current.draft.photos.map(({ key }) => key);
      await act(async () => {
        firstUri.resolve(getLibraryFileUri("library-a"));
        await firstUri.promise;
      });
      await waitForImports(hook);

      expect(source.getLibraryPhotoUri).toHaveBeenCalledTimes(2);
      expect(
        hook.result.current.photos.map(({ libraryId }) => libraryId)
      ).toEqual(["library-a", "library-b"]);
      // Tiles keep their keys through the import.
      expect(hook.result.current.draft.photos.map(({ key }) => key)).toEqual(
        keys
      );
      expect(hook.result.current.draft.isAddDisabled).toBe(false);
    });

    test("picked photos attach after the stored ones", async () => {
      source.pickFromLibrary.mockResolvedValueOnce([
        createPicked("picked-1"),
        createPicked("picked-2"),
      ]);
      const hook = await renderDraft({ initialPhotos: [createStoredPhoto(1)] });

      await act(() => hook.result.current.draft.addFromLibrary());
      expect(hook.result.current.draft.count).toBe(3);
      await waitForImports(hook);

      expect(
        hook.result.current.photos.map(({ source: kind }) => kind)
      ).toEqual(["library", "library", "library"]);
      expect(hook.result.current.photos[0].id).toBe("stored-1");
      expect(
        getTrackedEvents()
          .filter(([event]) => event === "photos:photo_added")
          .map(([, properties]) => properties?.count)
      ).toEqual([2, 3]);
    });

    test("remove takes a stored photo off the entry at once", async () => {
      const hook = await renderDraft({
        initialPhotos: [createStoredPhoto(1), createStoredPhoto(2)],
      });

      await remove(hook, 0);

      expect(hook.result.current.photos.map(({ id }) => id)).toEqual([
        "stored-2",
      ]);
      expect(hook.result.current.draft.count).toBe(1);
      expect(getTrackedEvents()).toContainEqual([
        "photos:photo_removed",
        expect.objectContaining({
          source: "library",
          count: 1,
          mode: "create",
        }),
      ]);
    });

    test("remove during the import drops the imported file", async () => {
      const uri = Promise.withResolvers<string>();
      source.getLibraryPhotoUri.mockImplementationOnce(() => uri.promise);
      const hook = await renderWithDayPhotos();
      await addSuggestion(hook, "library-a");
      expect(hook.result.current.draft.photos[0].isImporting).toBe(true);

      await remove(hook, 0);
      await act(async () => {
        uri.resolve(getLibraryFileUri("library-a"));
        await uri.promise;
      });
      await waitFor(() => {
        expect(hook.result.current.draft.isAddDisabled).toBe(false);
      });

      expect(hook.result.current.photos).toEqual([]);
      expect(hook.result.current.draft.photos).toEqual([]);
      expect(getSuggestionIds(hook)).toContain("library-a");
    });

    test("a suggestion moves up when added and back when removed", async () => {
      const hook = await renderWithDayPhotos();

      await addSuggestion(hook, "library-b");
      expect(getSuggestionIds(hook)).toEqual([
        "library-a",
        "library-c",
        "library-d",
      ]);
      await waitForImports(hook);
      expect(hook.result.current.photos).toEqual([
        expect.objectContaining({ source: "day", libraryId: "library-b" }),
      ]);

      await remove(hook, 0);
      expect(getSuggestionIds(hook)).toEqual(LIBRARY.map(({ id }) => id));

      // Added again: same stored photo, no second import.
      await addSuggestion(hook, "library-b");
      expect(hook.result.current.draft.photos[0].isImporting).toBe(false);
      expect(source.getLibraryPhotoUri).toHaveBeenCalledTimes(1);
      expect(
        getTrackedEvents()
          .filter(([event]) => event.startsWith("photos:photo_"))
          .map(([event, properties]) => [event, properties?.count])
      ).toEqual([
        ["photos:photo_added", 1],
        ["photos:photo_removed", 0],
        ["photos:photo_added", 1],
      ]);
    });

    test("a picked library photo is not suggested again", async () => {
      source.pickFromLibrary.mockResolvedValueOnce([
        { ...createPicked("picked"), libraryId: "library-c" },
      ]);
      const hook = await renderWithDayPhotos();

      await act(() => hook.result.current.draft.addFromLibrary());

      expect(getSuggestionIds(hook)).not.toContain("library-c");
      await waitForImports(hook);
      expect(hook.result.current.photos).toEqual([
        expect.objectContaining({ source: "library", libraryId: "library-c" }),
      ]);
      expect(getSuggestionIds(hook)).not.toContain("library-c");
    });

    test("a stored day photo is not suggested again", async () => {
      const stored = createStoredPhoto(1, {
        source: "day",
        libraryId: "library-b",
      });
      const hook = await renderWithDayPhotos({ initialPhotos: [stored] });

      expect(getSuggestionIds(hook)).not.toContain("library-b");
      expect(hook.result.current.draft.photos).toEqual([
        expect.objectContaining({ photo: stored, isImporting: false }),
      ]);
    });

    test("a failed import removes the photo and alerts", async () => {
      source.getLibraryPhotoUri.mockRejectedValueOnce(new Error("iCloud off"));
      const hook = await renderWithDayPhotos();

      await addSuggestion(hook, "library-a");
      await waitForImports(hook);

      expect(hook.result.current.draft.photos).toEqual([]);
      expect(hook.result.current.draft.count).toBe(0);
      expect(getSuggestionIds(hook)).toContain("library-a");
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

    test(`stops at ${MAX_PHOTOS_PER_ENTRY}: suggestion alerts, picker never opens`, async () => {
      const hook = await renderWithDayPhotos({
        initialPhotos: [1, 2, 3, 4].map((index) => createStoredPhoto(index)),
      });

      await addSuggestion(hook, "library-a");
      await addSuggestion(hook, "library-b");
      expect(hook.result.current.draft.isFull).toBe(true);

      await addSuggestion(hook, "library-c");
      await act(() => hook.result.current.draft.addFromLibrary());

      expect(hook.result.current.draft.count).toBe(MAX_PHOTOS_PER_ENTRY);
      expect(getSuggestionIds(hook)).toContain("library-c");
      expect(source.pickFromLibrary).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith("Up to 6 Photos per Entry");
      expect(
        getTrackedEvents().filter(([event]) => event === "photos:limit_reached")
      ).toHaveLength(2);
    });

    test("passes the remaining count to the picker", async () => {
      source.pickFromLibrary.mockResolvedValueOnce([]);
      const hook = await renderDraft({
        initialPhotos: [createStoredPhoto(1), createStoredPhoto(2)],
      });

      await act(() => hook.result.current.draft.addFromLibrary());

      expect(source.pickFromLibrary).toHaveBeenCalledWith({ limit: 4 });
      expect(getTrackedEvents()).toEqual(
        expect.arrayContaining([
          ["photos:picker_opened", expect.objectContaining({ remaining: 4 })],
          [
            "photos:picker_closed",
            expect.objectContaining({
              picked_count: 0,
              is_cancelled: true,
            }),
          ],
        ])
      );
    });
  });

  test("analytics payloads hold counts and enums only", async () => {
    source.pickFromLibrary.mockResolvedValueOnce([createPicked("picked")]);
    const hook = await renderDraft();
    await act(() =>
      hook.result.current.draft.allowDayAccess({ source: "row" })
    );
    await waitFor(() => {
      expect(hook.result.current.draft.suggestions).toHaveLength(
        LIBRARY.length
      );
    });
    await addSuggestion(hook, "library-a");
    await waitForImports(hook);
    await act(() => hook.result.current.draft.addFromLibrary());
    await waitForImports(hook);
    await remove(hook, 0);

    const events = getTrackedEvents();
    expect(events.map(([event]) => event)).toEqual(
      expect.arrayContaining([
        "photos:day_access_prompt_shown",
        "photos:day_access_answered",
        "photos:day_photos_loaded",
        "photos:photo_added",
        "photos:picker_opened",
        "photos:picker_closed",
        "photos:photo_removed",
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
