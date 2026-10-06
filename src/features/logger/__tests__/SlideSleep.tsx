import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { _generateItem } from "@/__tests__/utils";
import Colors from "@/constants/Colors";
import { setHealthSourceOverride } from "@/features/health";
import type { HealthSource, SleepSample } from "@/features/health";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY,
  useSettingsLoad,
} from "@/state/settings";
import { SlideSleep } from "../slides/SlideSleep";
import { LogDraftProvider } from "../logDraft";

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

let mockIsHealthFlagOn = true;
// oxlint-disable-next-line anti-slop/no-module-mocking -- the apple-health flag comes from PostHog after consent; each test picks on or off.
jest.mock("@/state/featureFlags", () => ({
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

const onSelect = jest.fn();

const Step = ({ canFillFromHealth }: { canFillFromHealth: boolean }) => {
  const { status } = useSettingsLoad();
  if (status !== "ready") {
    return null;
  }
  return (
    <SlideSleep
      onSelect={onSelect}
      onDisableStep={jest.fn()}
      showDisable={false}
      canFillFromHealth={canFillFromHealth}
    />
  );
};

const renderStep = ({ canFillFromHealth = true } = {}) =>
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
              sleep: { quality: null },
            }}
          >
            <Step canFillFromHealth={canFillFromHealth} />
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
    onSelect.mockClear();
    setHealthSourceOverride(source);
  });

  afterAll(() => {
    setHealthSourceOverride(null);
  });

  test("preselects the scored quality and shows last night's stages", async () => {
    await storeHealthSetting(true);
    await renderStep();

    await waitFor(() => {
      expect(isSelected("good")).toBe(true);
    });
    expect(
      screen.getByTestId("health-sleep-summary").props.accessibilityLabel
    ).toBe("Apple Health, 6h 55m asleep, Awake 15m, Core 6h 55m");
  });

  test("tap on the preselected quality keeps it and moves on", async () => {
    await storeHealthSetting(true);
    await renderStep();
    await waitFor(() => {
      expect(isSelected("good")).toBe(true);
    });

    fireEvent.press(screen.getByTestId("sleep-quality-good"));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
    expect(isSelected("good")).toBe(true);
  });

  test("another quality replaces the preselected one", async () => {
    await storeHealthSetting(true);
    await renderStep();
    await waitFor(() => {
      expect(isSelected("good")).toBe(true);
    });

    fireEvent.press(screen.getByTestId("sleep-quality-bad"));

    await waitFor(() => {
      expect(isSelected("bad")).toBe(true);
    });
    expect(isSelected("good")).toBe(false);
  });

  test.each([
    ["setting off", { setting: false, flag: true, create: true }],
    ["flag off", { setting: true, flag: false, create: true }],
    ["editing an entry", { setting: true, flag: true, create: false }],
  ])("%s: preselects nothing", async (_, { setting, flag, create }) => {
    mockIsHealthFlagOn = flag;
    await storeHealthSetting(setting);
    await renderStep({ canFillFromHealth: create });

    await screen.findByTestId("sleep-quality-good");
    expect(screen.queryByTestId("health-sleep-summary")).toBeNull();
    expect(isSelected("good")).toBe(false);
  });
});
