import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { act, renderHook, userEvent } from "@testing-library/react-native";
import { Alert } from "react-native";
import Colors from "@/constants/Colors";
import { INITIAL_STATE } from "@/constants/Settings";
import { FeedbackScreen } from "@/features/feedback/routes";
import { SettingsScreen } from "@/features/settings/routes";
import Providers from "@/shell/Providers";
import { AnalyticsProvider } from "@/state/analytics";
import { FeatureFlagsProvider } from "@/state/featureFlags";
import { SettingsProvider, STORAGE_KEY } from "@/state/settings";
import type { FeedackType, FeedbackSource } from "../Feedback";
import { useFeedbackForm } from "../hooks/useFeedbackForm";

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => {
  const { View } = jest.requireActual("react-native");
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: View,
    SafeAreaInsetsContext: jest.requireActual("react").createContext(insets),
    SafeAreaFrameContext: jest.requireActual("react").createContext(frame),
    initialWindowMetrics: { insets, frame },
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
  };
});

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-superwall is a native module imported transitively by Providers; the support client itself is injected
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
    ) => selector({ isConfigured: false, setEventTrackingBehavior: jest.fn() }),
    useSuperwallEvents: jest.fn(),
  }),
  { virtual: true }
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
  jest.spyOn(Alert, "alert").mockImplementation();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const renderSettings = async () => {
  const result = await renderRouter(
    {
      _layout: () => (
        <ThemeProvider
          value={{
            ...DefaultTheme,
            colors: { ...DefaultTheme.colors, ...Colors.light },
          }}
        >
          <Providers
            supportClient={{
              enabled: false,
              openSupport: () => Promise.resolve(),
            }}
          >
            <FeatureFlagsProvider options={{ enabled: false }}>
              <Stack />
            </FeatureFlagsProvider>
          </Providers>
        </ThemeProvider>
      ),
      "settings/index": SettingsScreen,
      feedback: FeedbackScreen,
    },
    { initialUrl: "/settings" }
  );
  jest.useRealTimers();
  return result;
};

describe("Feedback route", () => {
  test.each([
    {
      item: "Request Feature",
      placeholder: "It would be great if…",
      type: "idea",
    },
    { item: "Report Bug", placeholder: "I noticed that…", type: "issue" },
  ])(
    "user opens the $type form from $item in Settings",
    async ({ item, placeholder }) => {
      const screen = await renderSettings();

      await userEvent.press(await screen.findByText(item));

      expect(await screen.findByPlaceholderText(placeholder)).toBeOnTheScreen();
    }
  );
});

const renderForm = (type: FeedackType = "idea", source?: FeedbackSource) =>
  renderHook(() => useFeedbackForm(type, source), {
    wrapper: ({ children }) => (
      <SettingsProvider>
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </SettingsProvider>
    ),
  });

describe("Feedback form", () => {
  test("user cannot send a blank message", async () => {
    const { result } = await renderForm();

    await act(() => result.current.handleMessageChange("   "));

    expect(result.current.canSend).toBe(false);
    await act(async () => {
      expect(await result.current.send()).toBe(false);
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("user sends the message with its type", async () => {
    const { result } = await renderForm();

    await act(() => result.current.handleMessageChange("Calendar export"));
    await act(async () => {
      expect(await result.current.send()).toBe(true);
    });

    const [[, request]] = jest.mocked(global.fetch).mock.calls;
    expect(JSON.parse(String(request?.body))).toMatchObject({
      type: "idea",
      message: "Calendar export",
      source: "modal",
    });
    expect(result.current.isSending).toBe(false);
    // Success shows a toast, not an alert.
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  test("feedback from an emotion picker experiment names the picker", async () => {
    const { result } = await renderForm("other", "emotion_dials");

    await act(() => result.current.handleMessageChange("Dials feel slow"));
    await act(async () => {
      expect(await result.current.send()).toBe(true);
    });

    const [[, request]] = jest.mocked(global.fetch).mock.calls;
    expect(JSON.parse(String(request?.body))).toMatchObject({
      type: "other",
      source: "emotion_dials",
    });
  });

  test("user keeps the draft when sending fails", async () => {
    // SAFETY: `useFeedback` reads only `ok` and `status` of the response.
    jest
      .mocked(global.fetch)
      .mockResolvedValue({ ok: false, status: 500 } as Response);
    const { result } = await renderForm();

    await act(() => result.current.handleMessageChange("Calendar export"));
    await act(async () => {
      expect(await result.current.send()).toBe(false);
    });

    expect(result.current.message).toBe("Calendar export");
    expect(result.current.canSend).toBe(true);
    expect(result.current.hasFailed).toBe(true);
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
