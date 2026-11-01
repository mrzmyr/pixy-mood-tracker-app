import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, Stack, ThemeProvider, useRouter } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import {
  act,
  fireEvent,
  renderHook,
  userEvent,
} from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import Colors from "@/constants/colors";
import { INITIAL_STATE } from "@/constants/settings";
import { RequestScreen } from "@/features/feedback/routes";
import Providers from "@/shell/providers";
import { FeatureFlagsProvider } from "@/state/feature-flags";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider, STORAGE_KEY } from "@/state/settings";
import { useRequestForm } from "../hooks/use-request-form";
import type { RequestKind } from "../hooks/use-request-form";

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

const Home = () => {
  const router = useRouter();
  return (
    <>
      <Pressable
        onPress={() =>
          router.push({ pathname: "/request", params: { kind: "emotion" } })
        }
      >
        <Text>Missing one?</Text>
      </Pressable>
      <Pressable
        onPress={() =>
          router.push({ pathname: "/request", params: { kind: "role" } })
        }
      >
        <Text>Request a Role…</Text>
      </Pressable>
    </>
  );
};

const openRequest = async (opener: string) => {
  const screen = await renderRouter(
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
      index: Home,
      request: RequestScreen,
    },
    { initialUrl: "/" }
  );
  jest.useRealTimers();
  await userEvent.press(await screen.findByText(opener));
  return screen;
};

const sentBody = () => {
  const [[, request]] = jest.mocked(global.fetch).mock.calls;
  return JSON.parse(String(request?.body));
};

const renderForm = (kind: RequestKind) =>
  renderHook(() => useRequestForm(kind), {
    wrapper: ({ children }) => (
      <SettingsProvider>
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </SettingsProvider>
    ),
  });

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

describe("Request route", () => {
  test("user asking for a role sees the role question, not the emotion one", async () => {
    const screen = await openRequest("Request a Role…");

    expect(
      await screen.findByText("Which role is missing from your list?")
    ).toBeOnTheScreen();
    expect(screen.getByPlaceholderText("Neighbor, Mentor…")).toBeOnTheScreen();
    expect(screen.queryByText(/Emotions are as complex/u)).toBeNull();
  });

  test("user asking for an emotion learns why the list stays small", async () => {
    const screen = await openRequest("Missing one?");

    expect(
      await screen.findByText(/Emotions are as complex as people/u)
    ).toBeOnTheScreen();
  });

  test("email field shows only after turning on Want a reply", async () => {
    const screen = await openRequest("Request a Role…");

    await screen.findByTestId("request-role-word");
    expect(screen.queryByTestId("request-role-email")).toBeNull();
    fireEvent(screen.getByTestId("request-role-reply"), "valueChange", true);

    expect(await screen.findByTestId("request-role-email")).toBeOnTheScreen();
  });
});

describe("Request form", () => {
  test("user cannot send a blank word", async () => {
    const { result } = await renderForm("role");

    await act(() => result.current.handleWordChange("   "));

    expect(result.current.canSend).toBe(false);
    await act(async () => {
      expect(await result.current.send()).toBe(false);
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test.each([
    { kind: "emotion" as const, source: "logger", word: "Nostalgic" },
    { kind: "role" as const, source: "people", word: "Neighbor" },
  ])(
    "$kind request goes out as $kind feedback",
    async ({ kind, source, word }) => {
      const { result } = await renderForm(kind);

      await act(() => result.current.handleWordChange(` ${word} `));
      await act(async () => {
        expect(await result.current.send()).toBe(true);
      });

      expect(sentBody()).toMatchObject({ type: kind, source, message: word });
      expect(sentBody().email).toBeUndefined();
    }
  );

  test("email goes out only while Want a reply is on", async () => {
    const { result } = await renderForm("role");

    await act(() => {
      result.current.handleWordChange("Neighbor");
      result.current.handleWantsReplyChange(true);
      result.current.handleEmailChange("me@example.com");
    });
    await act(() => result.current.handleWantsReplyChange(false));
    expect(result.current.replyTo).toBeUndefined();
    await act(() => result.current.handleWantsReplyChange(true));
    expect(result.current.replyTo).toBe("me@example.com");

    await act(async () => {
      await result.current.send();
    });
    expect(sentBody().email).toBe("me@example.com");
  });

  test("failed send keeps the draft and shows the error", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    const { result } = await renderForm("role");

    await act(() => result.current.handleWordChange("Neighbor"));
    await act(async () => {
      expect(await result.current.send()).toBe(false);
    });

    expect(result.current.hasFailed).toBe(true);
    expect(result.current.canSend).toBe(true);
  });
});
