import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { fireEvent, render, userEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import Providers from "@/shell/Providers";
import { ToastHost } from "@/components/Toast";
import Colors from "@/constants/Colors";
import { INITIAL_STATE } from "@/constants/Settings";
import { STORAGE_KEY } from "@/state/settings";
import { _generateItem } from "@/testing/logItem";
import { EMOTIONS } from "../config";
import { LogDraftProvider, useLogDraft } from "../logDraft";
import { EMOTION_AFFECT } from "../slides/SlideEmotions/emotionAffect";
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

let mockIsDialsEnabled = true;
// oxlint-disable-next-line anti-slop/no-module-mocking -- the emotion-dials flag comes from PostHog after consent; each test picks on or off.
jest.mock("@/state/featureFlags", () => ({
  ...jest.requireActual("@/state/featureFlags"),
  useFeatureFlag: (flag: string) =>
    flag === "emotion-dials" && mockIsDialsEnabled,
}));

// Shows what the draft stores, like the next logger step would read it.
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
        <LogDraftProvider
          initialDraft={_generateItem({ emotions: [], rating: "very_good" })}
        >
          <SlideEmotions showDisable={false} />
          <DraftEmotions />
        </LogDraftProvider>
        <ToastHost />
      </Providers>
    </ThemeProvider>
  );

const topEmotionKey = (screen: Awaited<ReturnType<typeof renderSlide>>) =>
  screen
    .getAllByTestId(/^emotion-dials-row-/u)[0]
    ?.props.testID.replace("emotion-dials-row-", "");

const pleasantness = (key: string | undefined) =>
  Object.entries(EMOTION_AFFECT).find(([k]) => k === key)?.[1].pleasantness;

beforeEach(async () => {
  mockIsDialsEnabled = true;
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

describe("Emotion dials", () => {
  test("flag on: user picks an emotion from the dials and the entry keeps it", async () => {
    const user = userEvent.setup();
    const screen = await renderSlide();

    expect(await screen.findByTestId("emotion-dials-energy")).toBeTruthy();
    const top = topEmotionKey(screen);
    await user.press(screen.getByTestId(`emotion-dials-row-${top}`));

    expect(screen.getByTestId("draft-emotions").props.children).toBe(top);
    expect(
      screen.getByTestId(`emotion-dials-row-${top}`).props.accessibilityState
    ).toMatchObject({ checked: true });
  });

  test("flag on: a good mood starts pleasant, turning pleasantness down brings unpleasant emotions to the top", async () => {
    const screen = await renderSlide();
    const dial = () => screen.getByTestId("emotion-dials-pleasantness");
    await screen.findByTestId("emotion-dials-pleasantness");

    expect(pleasantness(topEmotionKey(screen))).toBeGreaterThan(0);

    // Eight steps of 0.5 move from pleasant (1.5) to the unpleasant end.
    for (const _step of Array.from({ length: 8 })) {
      // oxlint-disable-next-line no-await-in-loop -- each step reads the value the step before set
      await fireEvent(dial(), "accessibilityAction", {
        nativeEvent: { actionName: "decrement" },
      });
    }

    expect(dial().props.accessibilityValue).toEqual({ text: "Unpleasant" });
    expect(pleasantness(topEmotionKey(screen))).toBeLessThan(0);
  });

  test("flag off: the emotion grid with search stays", async () => {
    mockIsDialsEnabled = false;
    const screen = await renderSlide();

    expect(
      await screen.findByTestId("logger-emotions-search-input")
    ).toBeTruthy();
    expect(screen.queryByTestId("emotion-dials-energy")).toBeNull();
  });

  test("every emotion the logger offers has a place on the dials", () => {
    const missing = EMOTIONS.filter(
      (e) => e.disabled !== true && !(e.key in EMOTION_AFFECT)
    ).map((e) => e.key);

    expect(missing).toEqual([]);
  });
});
