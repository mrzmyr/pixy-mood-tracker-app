import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { renderRouter, screen } from "expo-router/testing-library";
import { userEvent, waitFor } from "@testing-library/react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { Text } from "react-native";
import { INITIAL_STATE } from "@/constants/settings";
import { LogsProvider, STORAGE_KEY as LOGS_KEY } from "@/features/logs";
import * as squareImage from "@/lib/square-image";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY as SETTINGS_KEY,
  useSettings,
} from "@/state/settings";
import { _generateItem } from "@/testing/log-item";
import { ProfileRow } from "../components/profile-row";
import { ProfileForm } from "../screens/profile-form";
import { getInitials } from "../use-profile";

/** Settings screen stand-in: the profile row plus the stored photo path. */
const SettingsScreen = () => {
  const { settings } = useSettings();
  return (
    <>
      <ProfileRow />
      <Text testID="stored-avatar">{settings.profileAvatar ?? "none"}</Text>
    </>
  );
};

const openSettings = async () => {
  await renderRouter(
    {
      _layout: () => (
        <SettingsProvider>
          <AnalyticsProvider>
            <LogsProvider>
              <Stack />
            </LogsProvider>
          </AnalyticsProvider>
        </SettingsProvider>
      ),
      settings: SettingsScreen,
      profile: ProfileForm,
    },
    { initialUrl: "/settings" }
  );
  jest.useRealTimers();
  return userEvent.setup();
};

const storeSettings = (profile: Partial<typeof INITIAL_STATE>) =>
  AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...INITIAL_STATE, deviceId: "device", ...profile })
  );

describe("profile", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(FileSystem, "deleteAsync").mockResolvedValue();
    jest.spyOn(FileSystem, "moveAsync").mockResolvedValue();
    jest.spyOn(FileSystem, "makeDirectoryAsync").mockResolvedValue();
    jest.spyOn(FileSystem, "readDirectoryAsync").mockResolvedValue([]);
    jest.spyOn(FileSystem, "getInfoAsync").mockResolvedValue({
      exists: false,
      isDirectory: false,
      uri: "",
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("empty profile invites a name; saving a name shows it in Settings", async () => {
    await storeSettings({});
    const user = await openSettings();

    expect(await screen.findByText("Add Your Name")).toBeTruthy();
    expect(screen.getByText("Name and photo, just for you")).toBeTruthy();

    await user.press(screen.getByTestId("settings-profile"));
    await user.type(await screen.findByTestId("profile-name"), "  Klara ");
    await user.press(screen.getByTestId("profile-save"));

    expect(await screen.findByText("Klara")).toBeTruthy();
    expect(screen.queryByText("Add Your Name")).toBeNull();
  });

  test("a set profile shows the month of the first entry", async () => {
    await storeSettings({ profileName: "Klara" });
    await AsyncStorage.setItem(
      LOGS_KEY,
      JSON.stringify({
        items: [
          _generateItem({ date: "2024-05-02" }),
          _generateItem({ date: "2024-03-14" }),
        ],
      })
    );
    await openSettings();

    expect(await screen.findByText("Logging since March 2024")).toBeTruthy();
  });

  test("Add Photo opens the library at once and saves the picked photo", async () => {
    await storeSettings({ profileName: "Klara" });
    const pick = jest
      .spyOn(ImagePicker, "launchImageLibraryAsync")
      .mockResolvedValue({
        canceled: false,
        assets: [{ uri: "file:///picked.jpg", width: 10, height: 10 }],
      });
    jest
      .spyOn(squareImage, "renderSquareJpeg")
      .mockResolvedValue("file:///cache/rendered.jpg");
    const user = await openSettings();

    await user.press(await screen.findByTestId("settings-profile"));
    await user.press(await screen.findByLabelText("Add Photo"));
    expect(pick).toHaveBeenCalledTimes(1);
    // With a photo, the button turns into the Edit Photo menu.
    expect(await screen.findByLabelText("Remove Photo")).toBeTruthy();
    await user.press(screen.getByTestId("profile-save"));

    await waitFor(() =>
      expect(screen.getByTestId("stored-avatar")).toHaveTextContent(
        /^profile\/photo-\d+\.jpg$/u
      )
    );
  });

  test("Remove Photo deletes the stored photo on save", async () => {
    await storeSettings({
      profileName: "Klara",
      profileAvatar: "profile/photo-1.jpg",
    });
    jest.spyOn(FileSystem, "getInfoAsync").mockResolvedValue({
      exists: true,
      isDirectory: true,
      uri: "",
      size: 0,
      modificationTime: 0,
    });
    jest
      .spyOn(FileSystem, "readDirectoryAsync")
      .mockResolvedValue(["photo-1.jpg"]);
    const user = await openSettings();

    await user.press(await screen.findByTestId("settings-profile"));
    await user.press(await screen.findByLabelText("Remove Photo"));
    await user.press(screen.getByTestId("profile-save"));

    await waitFor(() =>
      expect(screen.getByTestId("stored-avatar")).toHaveTextContent("none")
    );
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      `${FileSystem.documentDirectory}profile/photo-1.jpg`,
      { idempotent: true }
    );
  });

  test("initials use the first letters of up to two words", () => {
    expect(getInitials("klara meyer")).toBe("KM");
    expect(getInitials("  Klara  ")).toBe("K");
    expect(getInitials("Anna Lena Berg")).toBe("AL");
    expect(getInitials("")).toBe("");
  });
});
