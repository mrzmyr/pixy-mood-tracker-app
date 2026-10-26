import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, screen } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { _generateItem } from "@/testing/log-item";
import Colors from "@/constants/colors";
import { setHealthSourceOverride } from "@/features/health";
import type { HealthSource, SleepSample } from "@/features/health";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY,
  useSettingsLoad,
} from "@/state/settings";
import { SlideSleep } from "../slides/slide-sleep";
import { LogDraftProvider } from "../log-draft";

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

let mockIsHealthFlagOn = true;
// oxlint-disable-next-line anti-slop/no-module-mocking -- the apple-health flag comes from PostHog after consent; each test picks on or off.
jest.mock("@/state/feature-flags", () => ({
  useFeatureFlag: (flag: string) =>
    flag === "apple-health" && mockIsHealthFlagOn,
}));

// Entry on 2026-10-06; the night before: 23:00 to 06:10, one 15 minute
// wake-up. 415 minutes asleep without bedtime history scores 86: "good".
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

const Step = () => {
  const { status } = useSettingsLoad();
  if (status !== "ready") {
    return null;
  }
  return (
    <SlideSleep
      onNext={jest.fn()}
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
          <LogDraftProvider
            initialDraft={{
              ..._generateItem({ date: "2026-10-06" }),
              rating: null,
              sleep: { quality: "bad" },
            }}
          >
            <Step />
          </LogDraftProvider>
        </AnalyticsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );

const isSelected = (quality: string) =>
  screen.getByTestId(`sleep-quality-${quality}`).props.accessibilityState
    ?.selected === true;

const storeHealthSetting = (healthSleepEnabled: boolean) =>
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ healthSleepEnabled }));

describe("SlideSleep with Apple Health", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockIsHealthFlagOn = true;
    setHealthSourceOverride(source);
  });

  afterAll(() => {
    setHealthSourceOverride(null);
  });

  test("shows last night's stages and keeps the stored quality", async () => {
    await storeHealthSetting(true);
    await renderStep();

    const summary = await screen.findByTestId("health-sleep-summary");
    expect(summary.props.accessibilityLabel).toBe(
      "6h 55m asleep, 11:00 PM – 6:10 AM, Awake 15m, Core 6h 55m"
    );
    expect(isSelected("bad")).toBe(true);
    expect(isSelected("good")).toBe(false);
  });

  test.each([
    ["setting off", { setting: false, flag: true }],
    ["flag off", { setting: true, flag: false }],
  ])("%s: shows no stages", async (_, { setting, flag }) => {
    mockIsHealthFlagOn = flag;
    await storeHealthSetting(setting);
    await renderStep();

    await screen.findByTestId("sleep-quality-good");
    expect(screen.queryByTestId("health-sleep-summary")).toBeNull();
    expect(isSelected("bad")).toBe(true);
  });
});
