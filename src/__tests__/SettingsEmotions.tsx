import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, ThemeProvider } from "expo-router";
import {
  fireEvent,
  render,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import Providers from "@/shell/Providers";
import Colors from "@/constants/Colors";
import { INITIAL_STATE } from "@/constants/Settings";
import { STORAGE_KEY } from "@/state/settings";
import { SettingsEmotions } from "@/features/settings";

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

const renderEmotions = () =>
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
        <SettingsEmotions />
      </Providers>
    </ThemeProvider>
  );

const storedSteps = async () =>
  JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? "{}").steps;

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

describe("Settings > Check-in > Emotions", () => {
  test("user requests a missing emotion with its mood", async () => {
    const screen = await renderEmotions();

    await userEvent.press(await screen.findByTestId("request-emotion"));
    await userEvent.type(
      screen.getByTestId("request-emotion-word"),
      "Nostalgic"
    );
    await userEvent.press(screen.getByRole("radio", { name: "Hard" }));
    await userEvent.press(screen.getByTestId("request-emotion-send"));

    expect(await screen.findByTestId("request-emotion-sent")).toBeOnTheScreen();
    const [[, request]] = jest.mocked(global.fetch).mock.calls;
    expect(JSON.parse(String(request?.body))).toMatchObject({
      type: "emotion",
      source: "settings",
      message: "Nostalgic",
      mood: "hard",
    });
  });

  test("user sends no email unless they want a reply", async () => {
    const screen = await renderEmotions();

    await userEvent.press(await screen.findByTestId("request-emotion"));
    expect(screen.queryByTestId("request-emotion-email")).toBeNull();
    await userEvent.type(screen.getByTestId("request-emotion-word"), "Cozy");
    await userEvent.press(screen.getByTestId("request-emotion-send"));

    await screen.findByTestId("request-emotion-sent");
    const [[, request]] = jest.mocked(global.fetch).mock.calls;
    expect(JSON.parse(String(request?.body)).email).toBeUndefined();
  });

  test("user keeps the request when sending fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    const screen = await renderEmotions();

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
    const screen = await renderEmotions();

    await userEvent.press(await screen.findByTestId("request-emotion"));
    await userEvent.type(screen.getByTestId("request-emotion-word"), "Numb");
    await userEvent.press(screen.getByTestId("request-emotion-close"));

    expect(screen.queryByTestId("request-emotion-word")).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("user turns off the emotions step", async () => {
    const screen = await renderEmotions();
    expect(await storedSteps()).toContain("emotions");

    fireEvent(
      await screen.findByTestId("step-emotions-enabled"),
      "valueChange",
      false
    );

    await waitFor(async () =>
      expect(await storedSteps()).not.toContain("emotions")
    );
  });
});
