import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { Text } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { INITIAL_STATE } from "@/constants/Settings";
import { LogsProvider } from "@/features/logs";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider, STORAGE_KEY, useSettings } from "@/state/settings";
import Reminder from "../components/Reminder";

// oxlint-disable-next-line anti-slop/no-module-mocking -- the native time picker has no Jest implementation; the stub forwards picker events to the Reminder handler
jest.mock("../components/Clock", () => {
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
  return <Text testID="stored-time">{settings.reminderTime}</Text>;
};

const setup = async () => {
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
          <LogsProvider>
            <Reminder />
            <StoredTime />
          </LogsProvider>
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

const pick = (
  screen: Awaited<ReturnType<typeof setup>>,
  event: { type: string },
  date?: Date
) => fireEvent(screen.getByTestId("reminder-time"), "onChange", event, date);

describe("Reminder time picker", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("saves the picked time", async () => {
    const screen = await setup();
    await pick(screen, { type: "set" }, new Date(2026, 9, 6, 7, 30));
    await waitFor(() =>
      expect(screen.getByTestId("stored-time").props.children).toBe("07:30")
    );
  });

  it("keeps the old time when the picker is dismissed", async () => {
    const screen = await setup();
    await pick(screen, { type: "dismissed" }, new Date(2026, 9, 6, 7, 30));
    expect(screen.getByTestId("stored-time").props.children).toBe("20:00");
  });

  it("ignores a set event without a date", async () => {
    const screen = await setup();
    await pick(screen, { type: "set" });
    expect(screen.getByTestId("stored-time").props.children).toBe("20:00");
  });
});
