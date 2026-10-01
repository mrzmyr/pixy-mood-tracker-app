import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { screen, userEvent, waitFor } from "@testing-library/react-native";
import { Paths } from "expo-file-system";
import * as ExpoImageManipulator from "expo-image-manipulator";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { ActionSheetIOS, Alert, Text } from "react-native";
import type { AlertButton } from "react-native";
import { _generateItem } from "@/__tests__/utils";
import { INITIAL_STATE } from "@/constants/Settings";
import {
  LogsProvider,
  STORAGE_KEY as LOGS_KEY,
  useLogState,
} from "@/features/logs";
import {
  MAX_PHOTOS_PER_ENTRY,
  setPhotoSourceOverride,
} from "@/features/photos";
import type { PhotoSource } from "@/features/photos";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY as SETTINGS_KEY,
} from "@/state/settings";
import type { LogPhoto } from "@/types";
import { EntryPhotosScreen } from "../screens/EntryPhotos";
import { Photos } from "../screens/LogList/Photos";

// Helpers of the manual mock in src/__mocks__/expo-image-manipulator.js.
const { __setImageSize } =
  // SAFETY: Jest resolves this import to the manual mock, which adds the helpers.
  ExpoImageManipulator as typeof ExpoImageManipulator & {
    __setImageSize: (image: {
      uri: string;
      width: number;
      height: number;
    }) => void;
  };

const { capture: mockCapture } = getPostHogTestClient();

const ITEM_ID = "entry-1";

const createStoredPhoto = (index: number): LogPhoto => ({
  id: `stored-${index}`,
  fileName: `stored-${index}.jpg`,
  width: 100,
  height: 100,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const createPicked = (name: string) => {
  const uri = `${Paths.cache.uri}${name}.jpg`;
  __setImageSize({ uri, width: 1200, height: 1600 });
  return { uri, width: 1200, height: 1600 };
};

const source = {
  pickFromLibrary: jest.fn<
    ReturnType<PhotoSource["pickFromLibrary"]>,
    Parameters<PhotoSource["pickFromLibrary"]>
  >(),
  takePhoto: jest.fn<ReturnType<PhotoSource["takePhoto"]>, []>(),
};

// Prints the stored photo ids, so tests read what the entry saved.
const StoredPhotos = () => {
  const { items } = useLogState();
  const item = items.find((log) => log.id === ITEM_ID);
  return (
    <Text testID="stored-photos">
      {item?.photos.map((photo) => photo.id).join(",")}
    </Text>
  );
};

// Routes mount after logs load, like the app's StorageLoadGate.
const LoadedStack = () => (useLogState().loaded ? <Stack /> : null);

const DayPhotos = () => {
  const { items } = useLogState();
  const item = items.find((log) => log.id === ITEM_ID);
  return item ? <Photos item={item} /> : null;
};

const renderApp = async ({
  photos,
  initialUrl,
}: {
  photos: LogPhoto[];
  initialUrl: string;
}) => {
  await AsyncStorage.setItem(
    LOGS_KEY,
    JSON.stringify({ items: [_generateItem({ id: ITEM_ID, photos })] })
  );
  const result = await renderRouter(
    {
      _layout: () => (
        <SettingsProvider>
          <AnalyticsProvider options={{ enabled: true }}>
            <LogsProvider>
              <StoredPhotos />
              <LoadedStack />
            </LogsProvider>
          </AnalyticsProvider>
        </SettingsProvider>
      ),
      index: DayPhotos,
      "photos/[id]": EntryPhotosScreen,
    },
    { initialUrl }
  );
  jest.useRealTimers();
  return result;
};

// Presses the alert button with `style` once the prompt shows.
const answerAlertWith = (style: AlertButton["style"]) => {
  jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
    buttons?.find((button) => button.style === style)?.onPress?.();
  });
};

describe("day view photos", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...INITIAL_STATE, analyticsEnabled: true })
    );
    setPhotoSourceOverride(source);
  });

  afterEach(() => {
    setPhotoSourceOverride(null);
  });

  test("shows the add tile on an entry without photos", async () => {
    await renderApp({ photos: [], initialUrl: "/" });

    expect(await screen.findByTestId("photo-add-tile")).toHaveProp(
      "accessibilityLabel",
      "Add a photo"
    );
    expect(screen.queryByTestId("photo-thumbnail-1")).toBeNull();
  });

  test("saves picked library photos to the entry at once", async () => {
    jest
      .spyOn(ActionSheetIOS, "showActionSheetWithOptions")
      .mockImplementation((_options, selectButton) => selectButton(0));
    source.pickFromLibrary.mockResolvedValueOnce([
      createPicked("a"),
      createPicked("b"),
      createPicked("c"),
    ]);
    await renderApp({ photos: [], initialUrl: "/" });

    await userEvent.press(await screen.findByTestId("photo-add-tile"));

    expect(await screen.findByTestId("photo-thumbnail-3")).toBeOnTheScreen();
    expect(source.pickFromLibrary).toHaveBeenCalledWith({
      limit: MAX_PHOTOS_PER_ENTRY,
    });
    expect(screen.getByTestId("stored-photos").props.children).toMatch(
      /^[^,]+,[^,]+,[^,]+$/u
    );
    expect(screen.getByLabelText("Add photo")).toBeOnTheScreen();
    expect(mockCapture).toHaveBeenCalledWith(
      "day:photo_add_tapped",
      expect.anything()
    );
    expect(mockCapture).toHaveBeenCalledWith(
      "logger:photo_added",
      expect.objectContaining({ photos_count: 3, mode: "edit" })
    );
  });

  test("hides the add tile when the entry is full", async () => {
    await renderApp({
      photos: [1, 2, 3, 4, 5, 6].map(createStoredPhoto),
      initialUrl: "/",
    });

    expect(await screen.findByTestId("photo-thumbnail-6")).toBeOnTheScreen();
    expect(screen.queryByTestId("photo-add-tile")).toBeNull();
  });
});

describe("photo viewer of a stored entry", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...INITIAL_STATE, analyticsEnabled: true })
    );
  });

  test("removes only the current photo after confirm", async () => {
    answerAlertWith("destructive");
    await renderApp({
      photos: [1, 2, 3].map(createStoredPhoto),
      initialUrl: `/photos/${ITEM_ID}?index=1`,
    });

    await userEvent.press(await screen.findByTestId("photo-viewer-remove"));

    await waitFor(() =>
      expect(screen.getByTestId("stored-photos")).toHaveTextContent(
        "stored-1,stored-3"
      )
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      "Remove photo",
      expect.any(String),
      expect.any(Array),
      expect.anything()
    );
    expect(mockCapture).toHaveBeenCalledWith(
      "logger:photo_removed",
      expect.objectContaining({ photos_count: 2, mode: "edit" })
    );
  });

  test("shows the previous photo after removing the last one", async () => {
    answerAlertWith("destructive");
    await renderApp({
      photos: [1, 2, 3].map(createStoredPhoto),
      initialUrl: `/photos/${ITEM_ID}?index=2`,
    });

    await userEvent.press(await screen.findByLabelText("Remove photo 3"));

    expect(await screen.findByLabelText("Remove photo 2")).toBeOnTheScreen();
    expect(screen.getByTestId("stored-photos")).toHaveTextContent(
      "stored-1,stored-2"
    );
  });

  test("keeps every photo on cancel", async () => {
    answerAlertWith("cancel");
    await renderApp({
      photos: [1, 2, 3].map(createStoredPhoto),
      initialUrl: `/photos/${ITEM_ID}?index=1`,
    });

    await userEvent.press(await screen.findByTestId("photo-viewer-remove"));

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("stored-photos")).toHaveTextContent(
      "stored-1,stored-2,stored-3"
    );
  });
});
