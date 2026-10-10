import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { getPermissionsAsync } from "expo-notifications";
import { act, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import Colors from "@/constants/Colors";
import { LogsProvider } from "@/features/logs";
import { AnalyticsProvider } from "@/state/analytics";
import { INITIAL_STATE } from "@/constants/Settings";
import { SettingsProvider, STORAGE_KEY } from "@/state/settings";
import Reminder from "../components/Reminder";

const NOTE = "Notifications are off for Pixy.";

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-notifications is a native module; its exports are read-only
jest.mock("expo-notifications", () => ({
  __esModule: true,
  PermissionStatus: {
    GRANTED: "granted",
    DENIED: "denied",
    UNDETERMINED: "undetermined",
  },
  getPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: "date" },
}));

const mockGetPermissions = jest.mocked(getPermissionsAsync);

const mockStatus = (status: "granted" | "denied" | "undetermined") =>
  mockGetPermissions.mockResolvedValue(
    // SAFETY: the hook reads only `status`; other fields are fixed fillers
    {
      status,
      granted: status === "granted",
      canAskAgain: status === "undetermined",
      expires: "never",
    } as Awaited<ReturnType<typeof getPermissionsAsync>>
  );

const renderReminder = () =>
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
          <LogsProvider>
            <Reminder />
          </LogsProvider>
        </AnalyticsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );

describe("Reminder permission note", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STATE));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("shows the note and opens system settings when denied", async () => {
    mockStatus("denied");
    const openSettings = jest
      .spyOn(Linking, "openSettings")
      .mockResolvedValue();
    await renderReminder();

    expect(await screen.findByText(new RegExp(NOTE, "u"))).toBeOnTheScreen();
    act(() => {
      screen.getByRole("link", { name: "Open Settings" }).props.onPress();
    });
    expect(openSettings).toHaveBeenCalledTimes(1);
  });
});
