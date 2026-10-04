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
import { SettingsProvider, useSettingsLoad } from "@/state/settings";
import { SlidePhotos } from "../slides/SlidePhotos";
import { LogDraftProvider } from "../logDraft";

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
let dayPhotos = DAY_PHOTOS;
const manageLibraryAccess = jest.fn(() => Promise.resolve());

// Android by default: no photos of the day, the library picker only.
const source: PhotoSource = {
  pickFromLibrary: () =>
    Promise.resolve([{ uri: PICKED_URI, width: 1200, height: 1600 }]),
  getLibraryPermission: () => Promise.resolve(permission),
  requestLibraryPermission: () => Promise.resolve(permission),
  manageLibraryAccess,
  addLibraryListener: () => () => {},
  listPhotosOnDate: () => Promise.resolve(dayPhotos),
  getLibraryPhotoUri: ({ photo }) => Promise.resolve(photo.uri),
};

const Step = () => {
  const { status } = useSettingsLoad();
  if (status !== "ready") {
    return null;
  }
  return (
    <SlidePhotos
      mode="create"
      isActive
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
          <LogDraftProvider initialDraft={_generateItem({ photos: [] })}>
            <Step />
          </LogDraftProvider>
        </AnalyticsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );

const layOut = async (testID: string) => {
  await fireEvent(await screen.findByTestId(testID), "layout", {
    nativeEvent: { layout: { width: 350, height: 350 } },
  });
};

const getTile = (position: number) =>
  screen.getByTestId(`photo-pick-${position}`);

const isChecked = (position: number) =>
  getTile(position).props.accessibilityState.checked;

const waitForImport = (position: number) =>
  waitFor(() => {
    expect(getTile(position).props.accessibilityState).toMatchObject({
      busy: false,
    });
  });

/** Android: the card opens the picker; the pick lands checked in the grid. */
const pickOnAndroid = async () => {
  await fireEvent.press(await screen.findByTestId("photos-choose-action"));
  await screen.findByText("1 of 6");
  await layOut("photo-grid");
  await waitForImport(1);
};

const renderWithDayPhotos = async ({
  access = "granted",
}: { access?: "granted" | "limited" } = {}) => {
  permission = access;
  await renderStep();
  await layOut("photo-grid");
  await screen.findByTestId("photo-pick-2");
};

describe("SlidePhotos", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    permission = "unavailable";
    dayPhotos = DAY_PHOTOS;
    manageLibraryAccess.mockClear();
    __setImageSize({ uri: PICKED_URI, width: 1200, height: 1600 });
    for (const photo of DAY_PHOTOS) {
      __setImageSize({ uri: photo.uri, width: 3024, height: 4032 });
    }
    setPhotoSourceOverride(source);
  });

  afterEach(() => {
    setPhotoSourceOverride(null);
  });

  describe("Android", () => {
    test("card opens the picker; the pick shows checked", async () => {
      await renderStep();
      expect(await screen.findByText("0 of 6")).toBeTruthy();

      await pickOnAndroid();

      expect(isChecked(1)).toBe(true);
      expect(screen.queryByTestId("photos-choose")).toBeNull();
      // No photos of the day, so no day section.
      expect(screen.queryByText("From Today")).toBeNull();
      // "More…" opens the picker again.
      await fireEvent.press(screen.getByTestId("photo-add-tile"));
      await screen.findByText("2 of 6");
    });

    test("tap unchecks in place; tap again checks", async () => {
      await renderStep();
      await pickOnAndroid();

      await fireEvent.press(getTile(1));
      expect(screen.getByText("0 of 6")).toBeTruthy();
      expect(isChecked(1)).toBe(false);

      await fireEvent.press(getTile(1));
      expect(screen.getByText("1 of 6")).toBeTruthy();
      expect(isChecked(1)).toBe(true);
    });

    test("long press opens the viewer; Remove unchecks", async () => {
      await renderStep();
      await pickOnAndroid();

      await fireEvent(getTile(1), "longPress");
      expect(screen.getByTestId("photo-viewer")).toBeTruthy();

      await fireEvent.press(screen.getByText("Remove"));

      expect(screen.queryByTestId("photo-viewer")).toBeNull();
      expect(screen.getByText("0 of 6")).toBeTruthy();
      expect(isChecked(1)).toBe(false);
    });
  });

  describe("iOS", () => {
    test("day photos check in place with their order", async () => {
      await renderWithDayPhotos();
      expect(screen.getByText("From Today")).toBeTruthy();

      await fireEvent.press(getTile(2));
      await fireEvent.press(getTile(1));

      await screen.findByText("2 of 6");
      expect(
        within(screen.getByTestId("photo-pick-2-order")).getByText("1")
      ).toBeTruthy();
      expect(
        within(screen.getByTestId("photo-pick-1-order")).getByText("2")
      ).toBeTruthy();
    });

    test("library picks join the grid first, with a Library tag", async () => {
      await renderWithDayPhotos();

      await fireEvent.press(screen.getByTestId("photos-library-button"));

      await screen.findByText("1 of 6");
      await waitForImport(1);
      expect(screen.getByLabelText("Photo 1 of 3, Library")).toBeTruthy();
      expect(isChecked(1)).toBe(true);
      expect(isChecked(2)).toBe(false);
    });

    test("undetermined: card asks, Not Now leaves a button", async () => {
      permission = "undetermined";
      await renderStep();

      await fireEvent.press(
        await screen.findByTestId("photos-day-access-secondary")
      );

      expect(screen.queryByTestId("photos-day-access")).toBeNull();
      expect(screen.getByTestId("photos-day-access-button")).toBeTruthy();
    });

    test.each([
      ["denied", "photos-access-off"],
      ["granted", "photos-day-empty"],
    ] as const)("%s without day photos: shows %s", async (state, testID) => {
      permission = state;
      dayPhotos = [];
      await renderStep();

      expect(await screen.findByTestId(testID)).toBeTruthy();
      expect(screen.queryByTestId("photo-grid")).toBeNull();
    });

    test("limited: More Photos… opens the access picker", async () => {
      await renderWithDayPhotos({ access: "limited" });

      await fireEvent.press(screen.getByTestId("photos-more-access"));

      expect(manageLibraryAccess).toHaveBeenCalledTimes(1);
    });
  });

  test("at the limit a check shows the swap notice, no alert", async () => {
    permission = "granted";
    dayPhotos = ["a", "b", "c", "d", "e", "f", "g"].map((id) => ({
      id: `library-${id}`,
      uri: `${Paths.cache.uri}library-${id}.jpg`,
    }));
    for (const photo of dayPhotos) {
      __setImageSize({ uri: photo.uri, width: 3024, height: 4032 });
    }
    await renderStep();
    await layOut("photo-grid");
    await screen.findByTestId("photo-pick-7");

    for (const position of [1, 2, 3, 4, 5, 6]) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- taps run in order, like a user filling the entry
      await fireEvent.press(getTile(position));
    }
    await screen.findByText("6 of 6");
    await fireEvent.press(getTile(7));

    expect(screen.getByTestId("photos-limit-notice")).toBeTruthy();
    expect(isChecked(7)).toBe(false);

    await fireEvent.press(getTile(1));
    expect(screen.queryByTestId("photos-limit-notice")).toBeNull();
  });
});
