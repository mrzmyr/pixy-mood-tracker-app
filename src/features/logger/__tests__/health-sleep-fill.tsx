import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useEffect } from "react";
import { Pressable, Text } from "react-native";
import { _generateItem } from "@/testing/log-item";
import { setHealthSourceOverride } from "@/features/health";
import type { HealthSource, SleepSample } from "@/features/health";
import {
  LogsProvider,
  STORAGE_KEY as LOGS_KEY,
  useLogLoad,
} from "@/features/logs";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY as SETTINGS_KEY,
  useSettingsLoad,
} from "@/state/settings";
import { useHealthSleepFill } from "../hooks/use-health-sleep-fill";
import { LogDraftProvider, useLogDraft } from "../log-draft";
import type { LoggerMode } from "../logger";

// oxlint-disable-next-line anti-slop/no-module-mocking -- the apple-health flag comes from PostHog after consent; each test picks on or off.
jest.mock("@/state/feature-flags", () => ({
  useFeatureFlag: (flag: string) => flag === "apple-health",
}));

// Night before 2026-10-06: 23:00 to 06:10, one 15 minute wake-up. Scores
// "good". No sleep on other nights.
const NIGHT: SleepSample[] = [
  {
    stage: "core",
    start: new Date(2026, 9, 5, 23),
    end: new Date(2026, 9, 6, 2),
  },
  {
    stage: "awake",
    start: new Date(2026, 9, 6, 2),
    end: new Date(2026, 9, 6, 2, 15),
  },
  {
    stage: "core",
    start: new Date(2026, 9, 6, 2, 15),
    end: new Date(2026, 9, 6, 6, 10),
  },
];

const source: HealthSource = {
  isAvailable: () => true,
  requestSleepAccess: () => Promise.resolve(),
  getSleepSamples: (start, end) =>
    Promise.resolve(
      NIGHT.filter((sample) => sample.start >= start && sample.start < end)
    ),
};

let settle: () => Promise<void> = () => Promise.resolve();

const Fill = ({ mode }: { mode: LoggerMode }) => {
  const { draft, isDirty, setDateTime } = useLogDraft();
  const fill = useHealthSleepFill({ mode });
  useEffect(() => {
    ({ settle } = fill);
  });
  return (
    <>
      <Text testID="quality">{draft.sleep.quality ?? "none"}</Text>
      <Text testID="dirty">{String(isDirty)}</Text>
      <Pressable
        testID="next-day"
        onPress={() => setDateTime("2026-10-07T12:00:00")}
      />
    </>
  );
};

const Ready = ({ mode }: { mode: LoggerMode }) => {
  const settings = useSettingsLoad();
  const logs = useLogLoad();
  if (settings.status !== "ready" || logs.status !== "ready") {
    return null;
  }
  return (
    <LogDraftProvider
      initialDraft={{
        ..._generateItem({
          date: "2026-10-06",
          dateTime: "2026-10-06T12:00:00",
        }),
        rating: null,
        sleep: { quality: null },
      }}
    >
      <Fill mode={mode} />
    </LogDraftProvider>
  );
};

const renderFill = async ({ mode = "create" }: { mode?: LoggerMode } = {}) => {
  await render(
    <SettingsProvider>
      <AnalyticsProvider>
        <LogsProvider>
          <Ready mode={mode} />
        </LogsProvider>
      </AnalyticsProvider>
    </SettingsProvider>
  );
  await screen.findByTestId("quality");
  await act(() => settle());
};

const storeSettings = ({
  healthSleepEnabled = true,
  steps = ["rating", "sleep"],
}: {
  healthSleepEnabled?: boolean;
  steps?: string[];
} = {}) =>
  AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ healthSleepEnabled, steps })
  );

const quality = () => screen.getByTestId("quality").props.children;

describe("useHealthSleepFill", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    setHealthSourceOverride(source);
  });

  afterAll(() => {
    setHealthSourceOverride(null);
  });

  test("fills last night's quality without making the draft dirty", async () => {
    await storeSettings();
    await renderFill();

    expect(quality()).toBe("good");
    expect(screen.getByTestId("dirty").props.children).toBe("false");
  });

  test("moving the entry to a night without sleep drops the quality", async () => {
    await storeSettings();
    await renderFill();
    expect(quality()).toBe("good");

    await fireEvent.press(screen.getByTestId("next-day"));
    await act(() => settle());

    expect(quality()).toBe("none");
  });

  test.each([
    ["Auto Fill off", { healthSleepEnabled: false }],
    ["sleep step off", { steps: ["rating"] }],
  ])("%s: fills nothing", async (_, settings) => {
    await storeSettings(settings);
    await renderFill();

    expect(quality()).toBe("none");
  });

  test("fills nothing when an entry of the day holds sleep", async () => {
    await storeSettings();
    await AsyncStorage.setItem(
      LOGS_KEY,
      JSON.stringify({
        items: [
          _generateItem({
            date: "2026-10-06",
            dateTime: "2026-10-06T08:00:00",
            sleep: { quality: "bad" },
          }),
        ],
      })
    );
    await renderFill();

    expect(quality()).toBe("none");
  });

  test("edits fill nothing", async () => {
    await storeSettings();
    await renderFill({ mode: "edit" });

    expect(quality()).toBe("none");
  });
});
