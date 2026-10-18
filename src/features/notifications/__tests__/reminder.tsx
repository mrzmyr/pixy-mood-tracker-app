import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { Text } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { INITIAL_STATE } from "@/constants/settings";
import { LogsProvider } from "@/features/logs";
import { AnalyticsProvider } from "@/state/analytics";
import { FeatureFlagsContext } from "@/state/feature-flags/context";
import { SettingsProvider, STORAGE_KEY, useSettings } from "@/state/settings";
import Reminder from "../components/reminder";
import { defaultReminderScheduler } from "../reminder-scheduler";

// oxlint-disable-next-line anti-slop/no-module-mocking -- the native time picker has no Jest implementation; the stub forwards the picked time to the Reminder handler
jest.mock("../components/clock", () => {
  const { Pressable } = require("react-native");
  return {
    __esModule: true,
    default: ({ onChange }: { onChange: unknown }) => (
      // SAFETY: Reminder passes its onTimeChange handler; the test fires it directly
      <Pressable testID="reminder-time" onChange={onChange as never} />
    ),
  };
});

const StoredTime = () => {
  const { settings } = useSettings();
  return (
    <>
      <Text testID="stored-time">{settings.reminderTime}</Text>
      <Text testID="stored-recaps">
        {String(settings.recapNotificationsEnabled)}
      </Text>
    </>
  );
};

const FLAGS = {
  on: { flags: { recaps: true }, isLoading: false },
  off: { flags: { recaps: false }, isLoading: false },
};

const setup = async ({ recaps = false }: { recaps?: boolean } = {}) => {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...INITIAL_STATE,
      reminderEnabled: true,
      reminderTime: "20:00",
    })
  );
  const screen = await render(
    <ThemeProvider value={DefaultTheme}>
      <SettingsProvider>
        <AnalyticsProvider>
          <FeatureFlagsContext.Provider value={recaps ? FLAGS.on : FLAGS.off}>
            <LogsProvider>
              <Reminder />
              <StoredTime />
            </LogsProvider>
          </FeatureFlagsContext.Provider>
        </AnalyticsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
  await waitFor(() =>
    expect(screen.getByTestId("stored-time").props.children).toBe("20:00")
  );
  await waitFor(() => screen.getByTestId("reminder-time"));
  return screen;
};

const pick = (screen: Awaited<ReturnType<typeof setup>>, date: Date) =>
  fireEvent(screen.getByTestId("reminder-time"), "onChange", date);

describe("Reminder time picker", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("saves the picked time as HH:mm", async () => {
    const screen = await setup();
    await pick(screen, new Date(2026, 9, 6, 7, 30));
    await waitFor(() =>
      expect(screen.getByTestId("stored-time").props.children).toBe("07:30")
    );
  });

  it("saves an afternoon time in 24-hour form", async () => {
    const screen = await setup();
    await pick(screen, new Date(2026, 9, 6, 21, 5));
    await waitFor(() =>
      expect(screen.getByTestId("stored-time").props.children).toBe("21:05")
    );
  });
});

describe("Recaps notification toggle", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("shows while flag recaps is on", async () => {
    const screen = await setup({ recaps: true });
    expect(screen.getByTestId("recap-notifications-enabled")).toBeTruthy();
  });

  it("stays hidden while flag recaps is off", async () => {
    const screen = await setup();
    expect(screen.queryByTestId("recap-notifications-enabled")).toBeNull();
  });

  it("keeps Recaps off and reports a structured error when turning on fails", async () => {
    jest
      .spyOn(defaultReminderScheduler, "hasPermission")
      .mockRejectedValue(new Error("permission lookup failed"));
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => null);
    const screen = await setup({ recaps: true });

    fireEvent(
      screen.getByTestId("recap-notifications-enabled"),
      "valueChange",
      true
    );

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "recap_notifications_toggle_failed",
          why: expect.stringContaining("permission lookup failed"),
          fix: expect.any(String),
        })
      )
    );
    expect(screen.getByTestId("stored-recaps").props.children).toBe("false");
    expect(screen.getByTestId("recap-notifications-enabled").props.value).toBe(
      false
    );
    jest.restoreAllMocks();
  });
});
