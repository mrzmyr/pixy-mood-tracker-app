import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Paths } from "expo-file-system";
import * as ExpoImageManipulator from "expo-image-manipulator";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { useState } from "react";
import { Alert, Linking } from "react-native";
import { createStructuredError } from "@/lib/errors";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider, useSettings } from "@/state/settings";
import type { LogPhoto } from "@/types";
import { usePhotoActions } from "../hooks/usePhotoActions";
import { setPhotoSourceOverride } from "../photoSource";
import type { PhotoSource } from "../photoSource";
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

const createPicked = (name: string) => {
  const uri = `${Paths.cache.uri}${name}.jpg`;
  __setImageSize({ uri, width: 1200, height: 1600 });
  return { uri, width: 1200, height: 1600 };
};

const createStoredPhoto = (index: number): LogPhoto => ({
  id: `stored-${index}`,
  fileName: `stored-${index}.jpg`,
  width: 100,
  height: 100,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const source = {
  pickFromLibrary: jest.fn<
    ReturnType<PhotoSource["pickFromLibrary"]>,
    Parameters<PhotoSource["pickFromLibrary"]>
  >(),
  takePhoto: jest.fn<ReturnType<PhotoSource["takePhoto"]>, []>(),
};

const renderPhotoActions = async ({
  initialPhotos = [],
}: {
  initialPhotos?: LogPhoto[];
} = {}) => {
  const hook = await renderHook(
    () => {
      const [photos, setPhotos] = useState(initialPhotos);
      return {
        photos,
        actions: usePhotoActions({
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
  });
  return hook;
};

const PHOTO_EVENTS = new Set([
  "logger:photo_added",
  "logger:photo_removed",
  "logger:photo_limit_reached",
  "logger:camera_permission_denied",
]);

const getTrackedEvents = () =>
  jest
    .mocked(mockCapture)
    .mock.calls.filter(([event]) => PHOTO_EVENTS.has(String(event)));

const _console_error = console.error;

describe("usePhotoActions()", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    __resetImageSizes();
    await AsyncStorage.clear();
    setPhotoSourceOverride(source);
    console.error = jest.fn();
  });

  afterEach(() => {
    setPhotoSourceOverride(null);
    console.error = _console_error;
  });

  test("adds library photos and tracks counts only", async () => {
    source.pickFromLibrary.mockResolvedValueOnce([
      createPicked("a"),
      createPicked("b"),
    ]);
    const hook = await renderPhotoActions({
      initialPhotos: [createStoredPhoto(1)],
    });

    await act(() => hook.result.current.actions.addFromLibrary());

    expect(source.pickFromLibrary).toHaveBeenCalledWith({
      limit: MAX_PHOTOS_PER_ENTRY - 1,
    });
    expect(hook.result.current.photos).toHaveLength(3);
    expect(getTrackedEvents()).toEqual([
      [
        "logger:photo_added",
        expect.objectContaining({
          source: "library",
          photos_count: 3,
          mode: "create",
        }),
      ],
    ]);
    const [[, properties]] = getTrackedEvents();
    expect(properties).not.toHaveProperty("uri");
    expect(properties).not.toHaveProperty("fileName");
    expect(properties).not.toHaveProperty("width");
  });

  test("never adds more than the limit", async () => {
    source.pickFromLibrary.mockResolvedValueOnce([
      createPicked("a"),
      createPicked("b"),
      createPicked("c"),
    ]);
    const hook = await renderPhotoActions({
      initialPhotos: [1, 2, 3, 4].map(createStoredPhoto),
    });

    await act(() => hook.result.current.actions.addFromLibrary());

    expect(source.pickFromLibrary).toHaveBeenCalledWith({ limit: 2 });
    expect(hook.result.current.photos).toHaveLength(MAX_PHOTOS_PER_ENTRY);
    expect(hook.result.current.actions.isFull).toBe(true);
  });

  test("does not open the picker when the entry is full", async () => {
    const hook = await renderPhotoActions({
      initialPhotos: [1, 2, 3, 4, 5, 6].map(createStoredPhoto),
    });

    await act(() => hook.result.current.actions.addFromLibrary());
    await act(() => hook.result.current.actions.addFromCamera());

    expect(source.pickFromLibrary).not.toHaveBeenCalled();
    expect(source.takePhoto).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledTimes(2);
    expect(getTrackedEvents()).toEqual([
      ["logger:photo_limit_reached", expect.anything()],
      ["logger:photo_limit_reached", expect.anything()],
    ]);
  });

  test("adds nothing on cancel", async () => {
    source.pickFromLibrary.mockResolvedValueOnce([]);
    source.takePhoto.mockResolvedValueOnce(null);
    const hook = await renderPhotoActions();

    await act(() => hook.result.current.actions.addFromLibrary());
    await act(() => hook.result.current.actions.addFromCamera());

    expect(hook.result.current.photos).toEqual([]);
    expect(getTrackedEvents()).toEqual([]);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  test("adds a camera photo", async () => {
    source.takePhoto.mockResolvedValueOnce(createPicked("camera"));
    const hook = await renderPhotoActions();

    await act(() => hook.result.current.actions.addFromCamera());

    expect(hook.result.current.photos).toHaveLength(1);
    expect(getTrackedEvents()).toEqual([
      [
        "logger:photo_added",
        expect.objectContaining({ source: "camera", photos_count: 1 }),
      ],
    ]);
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
    const hook = await renderPhotoActions();

    await act(() => hook.result.current.actions.addFromCamera());

    expect(hook.result.current.photos).toEqual([]);
    expect(getTrackedEvents()).toEqual([
      ["logger:camera_permission_denied", expect.anything()],
    ]);
    const [[title, , buttons]] = jest.mocked(Alert.alert).mock.calls;
    expect(title).toBe("Camera access needed");
    buttons?.[1]?.onPress?.();
    expect(Linking.openSettings).toHaveBeenCalled();
  });

  test("keeps the draft unchanged when the import fails", async () => {
    source.pickFromLibrary.mockResolvedValueOnce([
      { uri: `${Paths.cache.uri}unreadable.jpg`, width: 1, height: 1 },
    ]);
    const hook = await renderPhotoActions({
      initialPhotos: [createStoredPhoto(1)],
    });

    await act(() => hook.result.current.actions.addFromLibrary());

    expect(hook.result.current.photos).toEqual([createStoredPhoto(1)]);
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({ status: "photo_import_failed" })
    );
    expect(getTrackedEvents()).toEqual([]);
  });

  test("removes a photo and tracks the new count", async () => {
    const hook = await renderPhotoActions({
      initialPhotos: [createStoredPhoto(1), createStoredPhoto(2)],
    });

    await act(() => {
      hook.result.current.actions.remove({ id: "stored-1" });
    });

    expect(hook.result.current.photos).toEqual([createStoredPhoto(2)]);
    expect(getTrackedEvents()).toEqual([
      [
        "logger:photo_removed",
        expect.objectContaining({ photos_count: 1, mode: "create" }),
      ],
    ]);
  });
});
