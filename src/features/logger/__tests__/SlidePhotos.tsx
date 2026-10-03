import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { Paths } from "expo-file-system";
import * as ExpoImageManipulator from "expo-image-manipulator";
import { _generateItem } from "@/__tests__/utils";
import Colors from "@/constants/Colors";
import { setPhotoSourceOverride } from "@/features/photos";
import type { LibraryPermission, PhotoSource } from "@/features/photos";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider, useSettings } from "@/state/settings";
import { SlidePhotos } from "../slides/SlidePhotos";
import { TemporaryLogProvider, useTemporaryLog } from "../temporaryLog";

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Helper of the manual mock in src/__mocks__/expo-image-manipulator.js.
const { __setImageSize } =
  // SAFETY: Jest resolves this import to the manual mock, which adds the helper.
  ExpoImageManipulator as typeof ExpoImageManipulator & {
    __setImageSize: (image: {
      uri: string;
      width: number;
      height: number;
    }) => void;
  };

const PICKED_URI = `${Paths.cache.uri}picked.jpg`;
const DAY_PHOTOS = ["a", "b"].map((id) => ({
  id: `library-${id}`,
  uri: `${Paths.cache.uri}library-${id}.jpg`,
}));

let permission: LibraryPermission = "unavailable";

// Android by default: no photos of the day, the library picker only.
const source: PhotoSource = {
  pickFromLibrary: () =>
    Promise.resolve([{ uri: PICKED_URI, width: 1200, height: 1600 }]),
  getLibraryPermission: () => Promise.resolve(permission),
  requestLibraryPermission: () => Promise.resolve(permission),
  manageLibraryAccess: () => Promise.resolve(),
  addLibraryListener: () => () => {},
  listPhotosOnDate: () => Promise.resolve(DAY_PHOTOS),
  getLibraryPhotoUri: ({ photo }) => Promise.resolve(photo.uri),
};

const Step = () => {
  const tempLog = useTemporaryLog(_generateItem({ photos: [] }));
  const { settings } = useSettings();
  if (!tempLog.isInitialized || !settings.loaded) {
    return null;
  }
  return (
    <SlidePhotos
      mode="create"
      isActive
      onChange={(photos) => tempLog.update({ photos })}
      onDisableStep={jest.fn()}
      showDisable={false}
    />
  );
};

const renderStep = () =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SettingsProvider>
        <AnalyticsProvider>
          <TemporaryLogProvider>
            <Step />
          </TemporaryLogProvider>
        </AnalyticsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );

const layOut = async (testID: string) => {
  await fireEvent(await screen.findByTestId(testID), "layout", {
    nativeEvent: { layout: { width: 350, height: 350 } },
  });
};

const getSuggestions = () =>
  within(screen.getByTestId("photo-suggestions")).queryAllByRole("button");

const addPhoto = async () => {
  await layOut("photo-grid");
  await fireEvent.press(screen.getByTestId("photo-add-tile"));
  await screen.findByText("1 of 6");
  await waitFor(() => {
    expect(
      screen.getByLabelText("Photo 1 of 1").props.accessibilityState
    ).toMatchObject({ busy: false });
  });
};

describe("SlidePhotos", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    permission = "unavailable";
    __setImageSize({ uri: PICKED_URI, width: 1200, height: 1600 });
    for (const photo of DAY_PHOTOS) {
      __setImageSize({ uri: photo.uri, width: 3024, height: 4032 });
    }
    setPhotoSourceOverride(source);
  });

  afterEach(() => {
    setPhotoSourceOverride(null);
  });

  test("add tile opens the library picker directly", async () => {
    await renderStep();
    await addPhoto();

    expect(screen.getByLabelText("Photo 1 of 1")).toBeTruthy();
    expect(screen.queryByText("Take Photo")).toBeNull();
    // Android: no photos of the day, so no section below.
    expect(screen.queryByTestId("photos-day-section")).toBeNull();
  });

  test("remove button on the tile removes the photo at once", async () => {
    await renderStep();
    await addPhoto();

    await fireEvent.press(screen.getByLabelText("Remove Photo 1"));

    expect(screen.queryByText("1 of 6")).toBeNull();
    expect(screen.queryByLabelText("Photo 1 of 1")).toBeNull();
  });

  test("tap on a photo opens the viewer; Remove removes it", async () => {
    await renderStep();
    await addPhoto();

    await fireEvent.press(screen.getByLabelText("Photo 1 of 1"));
    expect(screen.getByTestId("photo-viewer")).toBeTruthy();
    expect(screen.getByText("1 of 6")).toBeTruthy();

    await fireEvent.press(screen.getByText("Remove"));

    expect(screen.queryByTestId("photo-viewer")).toBeNull();
    expect(screen.queryByText("1 of 6")).toBeNull();
  });

  test("a suggestion moves to the top on tap and back on remove", async () => {
    permission = "granted";
    await renderStep();
    await layOut("photo-grid");
    await layOut("photo-suggestions");
    expect(screen.getByText("From Today")).toBeTruthy();

    expect(getSuggestions()).toHaveLength(2);

    await fireEvent.press(getSuggestions()[0]);

    await screen.findByText("1 of 6");
    expect(screen.getByLabelText("Remove Photo 1")).toBeTruthy();
    expect(getSuggestions()).toHaveLength(1);

    await fireEvent.press(screen.getByLabelText("Remove Photo 1"));

    expect(screen.queryByText("1 of 6")).toBeNull();
    expect(getSuggestions()).toHaveLength(2);
  });
});
