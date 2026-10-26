import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { render, userEvent } from "@testing-library/react-native";
import Providers from "@/shell/providers";
import { ToastHost } from "@/components/toast";
import Colors from "@/constants/colors";
import { INITIAL_STATE } from "@/constants/settings";
import { STORAGE_KEY } from "@/state/settings";
import { _generateItem } from "@/testing/log-item";
import { LogDraftProvider } from "../log-draft";
import { SlideEmotions } from "../slides/slide-emotions";

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
        </LogDraftProvider>
        <ToastHost />
      </Providers>
    </ThemeProvider>
  );

beforeEach(async () => {
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

it("finds emotions outside the basic set by name", async () => {
  const user = userEvent.setup();
  const screen = await renderSlide();

  await user.type(
    await screen.findByTestId("logger-emotions-search-input"),
    "thank"
  );

  expect(screen.getByText("Thankful")).toBeTruthy();
  expect(screen.queryByText("Compassionate")).toBeNull();
});
