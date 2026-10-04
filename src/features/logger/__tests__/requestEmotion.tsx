import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { fireEvent, render, userEvent } from "@testing-library/react-native";
import Providers from "@/shell/Providers";
import { ToastHost } from "@/components/Toast";
import Colors from "@/constants/Colors";
import { INITIAL_STATE } from "@/constants/Settings";
import { STORAGE_KEY } from "@/state/settings";
import { _generateItem } from "@/__tests__/utils";
import { LogDraftProvider } from "../logDraft";
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

describe("Logger > emotions > request a missing emotion", () => {
  test("user requests a missing emotion", async () => {
    const screen = await renderSlide();

    await userEvent.press(await screen.findByTestId("request-emotion"));
    await userEvent.type(
      screen.getByTestId("request-emotion-word"),
      "Nostalgic"
    );
    await userEvent.press(screen.getByTestId("request-emotion-send"));

    expect(await screen.findByTestId("toast")).toHaveTextContent(
      "Request sent"
    );
    expect(screen.queryByTestId("request-emotion-word")).toBeNull();
    const [[, request]] = jest.mocked(global.fetch).mock.calls;
    expect(JSON.parse(String(request?.body))).toMatchObject({
      type: "emotion",
      source: "logger",
      message: "Nostalgic",
    });
  });

  test("user sends no email unless they want a reply", async () => {
    const screen = await renderSlide();

    await userEvent.press(await screen.findByTestId("request-emotion"));
    expect(screen.queryByTestId("request-emotion-email")).toBeNull();
    await userEvent.type(screen.getByTestId("request-emotion-word"), "Cozy");
    await userEvent.press(screen.getByTestId("request-emotion-send"));

    await screen.findByTestId("toast");
    const [[, request]] = jest.mocked(global.fetch).mock.calls;
    expect(JSON.parse(String(request?.body)).email).toBeUndefined();
  });

  test("user who wants a reply learns it comes by email", async () => {
    const screen = await renderSlide();

    await userEvent.press(await screen.findByTestId("request-emotion"));
    await userEvent.type(screen.getByTestId("request-emotion-word"), "Cozy");
    fireEvent(screen.getByTestId("request-emotion-reply"), "valueChange", true);
    await userEvent.type(
      await screen.findByTestId("request-emotion-email"),
      "me@example.com"
    );
    await userEvent.press(screen.getByTestId("request-emotion-send"));

    expect(await screen.findByTestId("toast")).toHaveTextContent(
      "Request sentI’ll reply by email."
    );
    const [[, request]] = jest.mocked(global.fetch).mock.calls;
    expect(JSON.parse(String(request?.body)).email).toBe("me@example.com");
  });

  test("user keeps the request when sending fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    const screen = await renderSlide();

    await userEvent.press(await screen.findByTestId("request-emotion"));
    await userEvent.type(screen.getByTestId("request-emotion-word"), "Numb");
    await userEvent.press(screen.getByTestId("request-emotion-send"));

    expect(
      await screen.findByTestId("request-emotion-error")
    ).toBeOnTheScreen();
    expect(screen.getByTestId("request-emotion-word")).toHaveDisplayValue(
      "Numb"
    );
  });

  test("user closes the request sheet without sending", async () => {
    const screen = await renderSlide();

    await userEvent.press(await screen.findByTestId("request-emotion"));
    await userEvent.type(screen.getByTestId("request-emotion-word"), "Numb");
    await userEvent.press(screen.getByTestId("request-emotion-close"));

    expect(screen.queryByTestId("request-emotion-word")).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
