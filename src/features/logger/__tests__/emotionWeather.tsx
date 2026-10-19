import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { render, userEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import Providers from "@/shell/Providers";
import { ToastHost } from "@/components/Toast";
import Colors from "@/constants/Colors";
import { INITIAL_STATE } from "@/constants/Settings";
import { STORAGE_KEY } from "@/state/settings";
import { _generateItem } from "@/testing/logItem";
import { LogDraftProvider, useLogDraft } from "../logDraft";
import { SlideEmotions } from "../slides/SlideEmotions";

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-superwall is a native module imported transitively by Providers
jest.mock(
  "expo-superwall",
  () => ({
    SuperwallExpoModule: { consume: jest.fn() },
    SuperwallProvider: ({ children }: { children: React.ReactNode }) =>
      children,
    usePlacement: () => ({
      registerPlacement: jest.fn(),
      state: { status: "idle" },
    }),
    useSuperwall: <T,>(
      selector: (state: {
        isConfigured: boolean;
        setEventTrackingBehavior: jest.Mock;
      }) => T
    ) =>
      selector({
        isConfigured: false,
        setEventTrackingBehavior: jest.fn(),
      }),
    useSuperwallEvents: jest.fn(),
  }),
  { virtual: true }
);

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

let mockIsWeatherEnabled = true;
// oxlint-disable-next-line anti-slop/no-module-mocking -- the emotion-picker variant comes from PostHog after consent; each test picks weather or none.
jest.mock("@/state/featureFlags", () => ({
  ...jest.requireActual("@/state/featureFlags"),
  useFeatureFlagVariant: (flag: string) =>
    flag === "emotion-picker" && mockIsWeatherEnabled ? "weather" : undefined,
}));

// Shows the draft's emotions, so tests check what the entry stores.
const DraftEmotions = () => {
  const { draft } = useLogDraft();
  return <Text testID="draft-emotions">{draft.emotions.join(",")}</Text>;
};

const renderSlide = () =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <Providers
        supportClient={{ enabled: false, openSupport: () => Promise.resolve() }}
      >
        <LogDraftProvider initialDraft={_generateItem({ emotions: [] })}>
          <SlideEmotions showDisable={false} />
          <DraftEmotions />
        </LogDraftProvider>
        <ToastHost />
      </Providers>
    </ThemeProvider>
  );

beforeEach(async () => {
  mockIsWeatherEnabled = true;
  await AsyncStorage.clear();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...INITIAL_STATE,
      actionsDone: [{ title: "onboarding", date: "2026-10-03T00:00:00.000Z" }],
    })
  );
  global.fetch = jest.fn().mockResolvedValue({ ok: true });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Inner weather picker", () => {
  test("flag on: weather tiles replace the emotion grid", async () => {
    const screen = await renderSlide();

    expect(await screen.findByTestId("emotion-weather-sunny")).toBeTruthy();
    expect(screen.queryByTestId("logger-emotions-search")).toBeNull();
    expect(screen.getByTestId("logger-emotions-feedback")).toBeTruthy();
  });

  test("picking a tile shows its emotions", async () => {
    const user = userEvent.setup();
    const screen = await renderSlide();

    expect(screen.queryByText("Exhausted")).toBeNull();
    await user.press(await screen.findByTestId("emotion-weather-frost"));

    expect(screen.getByTestId("emotion-weather-card-frost")).toBeTruthy();
    expect(screen.getByText("Exhausted")).toBeTruthy();
  });

  test("selecting an emotion stores it on the entry", async () => {
    const user = userEvent.setup();
    const screen = await renderSlide();

    await user.press(await screen.findByTestId("emotion-weather-frost"));
    await user.press(screen.getByLabelText("Exhausted"));

    expect(screen.getByTestId("draft-emotions")).toHaveTextContent("exhausted");
  });

  test("a third tile replaces the oldest", async () => {
    const user = userEvent.setup();
    const screen = await renderSlide();

    await user.press(await screen.findByTestId("emotion-weather-sunny"));
    await user.press(screen.getByTestId("emotion-weather-foggy"));
    await user.press(screen.getByTestId("emotion-weather-storm"));

    expect(screen.queryByTestId("emotion-weather-card-sunny")).toBeNull();
    expect(screen.getByTestId("emotion-weather-card-foggy")).toBeTruthy();
    expect(screen.getByTestId("emotion-weather-card-storm")).toBeTruthy();
  });

  test("flag off: emotion grid stays", async () => {
    mockIsWeatherEnabled = false;
    const screen = await renderSlide();

    expect(await screen.findByTestId("logger-emotions-search")).toBeTruthy();
    expect(screen.queryByTestId("emotion-weather")).toBeNull();
    expect(screen.queryByTestId("logger-emotions-feedback")).toBeNull();
  });
});
