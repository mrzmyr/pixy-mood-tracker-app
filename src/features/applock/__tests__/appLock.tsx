import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import * as LocalAuthentication from "expo-local-authentication";
import {
  act,
  fireEvent,
  render,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";
import Providers from "@/shell/Providers";
import { AnalyticsProvider } from "@/state/analytics";
import { FeatureFlagsContext } from "@/state/featureFlags/context";
import Colors from "@/constants/Colors";
import { INITIAL_STATE } from "@/constants/Settings";
import { SettingsProvider, STORAGE_KEY } from "@/state/settings";
import { createFakeSupportClient } from "@/support/clients";
import { AppLockMenuItem, AppLockProvider, AppLockScreen } from "..";
import { AppLockSetting } from "../AppLockSetting";
import { LOCK_AFTER_MS } from "../lockTiming";

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

// oxlint-disable-next-line anti-slop/no-module-mocking -- react-native-safe-area-context needs native insets that Jest does not provide
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const authenticateAsync = jest.mocked(LocalAuthentication.authenticateAsync);
const getEnrolledLevelAsync = jest.mocked(
  LocalAuthentication.getEnrolledLevelAsync
);

let appStateHandlers: ((state: AppStateStatus) => void)[] = [];
const changeAppState = (state: AppStateStatus) => {
  for (const handler of appStateHandlers) {
    handler(state);
  }
};

const storeSettings = (appLockEnabled: boolean, analyticsEnabled = false) =>
  AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...INITIAL_STATE,
      appLockEnabled,
      analyticsEnabled,
      actionsDone: [{ title: "onboarding", date: "2026-10-03T00:00:00.000Z" }],
    })
  );

const readStoredLock = async () =>
  JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? "{}").appLockEnabled;

const renderApp = async () =>
  await render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <Providers supportClient={createFakeSupportClient()}>
        <AppLockMenuItem />
        <AppLockSetting />
        <AppLockScreen />
      </Providers>
    </ThemeProvider>
  );

const THEME = {
  ...DefaultTheme,
  dark: false,
  colors: { ...DefaultTheme.colors, ...Colors.light },
};

/** PostHog flags as loaded after consent. */
const BYPASS_ON = { flags: { "app-lock-bypass": true }, isLoading: false };
const NO_FLAGS = { flags: {}, isLoading: false };

/** Lock screen with fixed PostHog flags. */
const renderWithFlags = async (flags: typeof NO_FLAGS) =>
  await render(
    <ThemeProvider value={THEME}>
      <SettingsProvider>
        <AnalyticsProvider options={{ enabled: true }}>
          <FeatureFlagsContext.Provider value={flags}>
            <AppLockProvider>
              <AppLockScreen />
            </AppLockProvider>
          </FeatureFlagsContext.Provider>
        </AnalyticsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );

/** Moves the app to the background and back after `awayMs`. */
const leaveFor = async (awayMs: number) => {
  const now = Date.now();
  const clock = jest.spyOn(Date, "now").mockReturnValue(now);
  await act(() => changeAppState("background"));
  clock.mockReturnValue(now + awayMs);
  await act(() => changeAppState("active"));
  clock.mockRestore();
};

beforeEach(async () => {
  await AsyncStorage.clear();
  authenticateAsync.mockReset();
  authenticateAsync.mockResolvedValue({ success: true });
  getEnrolledLevelAsync.mockReset();
  getEnrolledLevelAsync.mockResolvedValue(
    LocalAuthentication.SecurityLevel.SECRET
  );
  // Native constants set this on devices; Jest leaves it `null`.
  Object.assign(AppState, { currentState: "active" });
  appStateHandlers = [];
  jest.spyOn(AppState, "addEventListener").mockImplementation((_, handler) => {
    appStateHandlers.push(handler);
    return {
      remove: () => {
        appStateHandlers = appStateHandlers.filter((item) => item !== handler);
      },
    };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("App Lock", () => {
  test("locked app asks for the OS prompt on launch and opens after it", async () => {
    await storeSettings(true);
    const screen = await renderApp();

    await waitFor(() => expect(authenticateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByTestId("app-lock-screen")).toBeNull()
    );
  });

  test("app without the lock never asks for the OS prompt", async () => {
    await storeSettings(false);
    const screen = await renderApp();

    await screen.findByTestId("app-lock-enabled");
    expect(screen.queryByTestId("app-lock-screen")).toBeNull();
    expect(authenticateAsync).not.toHaveBeenCalled();
  });

  test("cancelled prompt keeps the lock, Unlock asks again", async () => {
    await storeSettings(true);
    authenticateAsync.mockResolvedValueOnce({
      success: false,
      error: "user_cancel",
    });
    const screen = await renderApp();

    const unlock = await screen.findByTestId("app-lock-unlock");
    await waitFor(() => expect(authenticateAsync).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByText("Couldn’t confirm it’s you. Try again.")
    ).toBeNull();

    await userEvent.press(unlock);

    await waitFor(() =>
      expect(screen.queryByTestId("app-lock-screen")).toBeNull()
    );
    expect(authenticateAsync).toHaveBeenCalledTimes(2);
  });

  test("failed prompt keeps the lock and tells the user to try again", async () => {
    await storeSettings(true);
    authenticateAsync.mockResolvedValueOnce({
      success: false,
      error: "lockout",
    });
    const screen = await renderApp();

    expect(
      await screen.findByText("Couldn’t confirm it’s you. Try again.")
    ).toBeOnTheScreen();
    expect(screen.getByTestId("app-lock-screen")).toBeOnTheScreen();
  });

  test("locks again after 1 minute away, not after a short trip", async () => {
    await storeSettings(true);
    const screen = await renderApp();
    // Launch prompt done: settings loaded and the lock opened.
    await waitFor(() => expect(authenticateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByTestId("app-lock-screen")).toBeNull()
    );

    await leaveFor(LOCK_AFTER_MS - 1000);
    expect(screen.queryByTestId("app-lock-screen")).toBeNull();
    expect(authenticateAsync).toHaveBeenCalledTimes(1);

    authenticateAsync.mockResolvedValueOnce({
      success: false,
      error: "user_cancel",
    });
    await leaveFor(LOCK_AFTER_MS);
    expect(await screen.findByTestId("app-lock-unlock")).toBeOnTheScreen();
    expect(authenticateAsync).toHaveBeenCalledTimes(2);
  });

  test("hides content while the app is not in front", async () => {
    await storeSettings(true);
    const screen = await renderApp();
    // Launch prompt done: settings loaded and the lock opened.
    await waitFor(() => expect(authenticateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByTestId("app-lock-screen")).toBeNull()
    );

    await act(() => changeAppState("inactive"));

    expect(screen.getByTestId("app-lock-screen")).toBeOnTheScreen();
    expect(screen.queryByTestId("app-lock-unlock")).toBeNull();
  });

  test("opens when the device passcode was removed", async () => {
    await storeSettings(true);
    getEnrolledLevelAsync.mockResolvedValue(
      LocalAuthentication.SecurityLevel.NONE
    );
    authenticateAsync.mockResolvedValue({
      success: false,
      error: "passcode_not_set",
    });
    const screen = await renderApp();

    await waitFor(() => expect(authenticateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByTestId("app-lock-screen")).toBeNull()
    );
  });

  test("turning the lock on needs the OS prompt", async () => {
    await storeSettings(false);
    authenticateAsync.mockResolvedValueOnce({
      success: false,
      error: "user_cancel",
    });
    const screen = await renderApp();
    const toggle = await screen.findByTestId("app-lock-enabled");

    await act(() => fireEvent(toggle, "valueChange", true));
    await waitFor(() => expect(authenticateAsync).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("app-lock-enabled").props.value).toBe(false);
    expect(await readStoredLock()).toBe(false);

    await act(() => fireEvent(toggle, "valueChange", true));
    await waitFor(() =>
      expect(screen.getByTestId("app-lock-enabled").props.value).toBe(true)
    );
    await waitFor(async () => expect(await readStoredLock()).toBe(true));
    expect(screen.queryByTestId("app-lock-screen")).toBeNull();
  });

  test("no cover flashes while the OS prompt fades out", async () => {
    await storeSettings(false);
    // The prompt leaves the app `inactive` until it is gone.
    authenticateAsync.mockImplementationOnce(() => {
      Object.assign(AppState, { currentState: "inactive" });
      changeAppState("inactive");
      return Promise.resolve({ success: true });
    });
    const screen = await renderApp();
    const toggle = await screen.findByTestId("app-lock-enabled");

    await act(() => fireEvent(toggle, "valueChange", true));
    await waitFor(() =>
      expect(screen.getByTestId("app-lock-enabled").props.value).toBe(true)
    );
    expect(screen.queryByTestId("app-lock-screen")).toBeNull();

    Object.assign(AppState, { currentState: "active" });
    await act(() => changeAppState("active"));
    expect(screen.queryByTestId("app-lock-screen")).toBeNull();
  });

  test("bypass flag opens a locked app without the OS prompt", async () => {
    await storeSettings(true);
    const screen = await renderWithFlags(BYPASS_ON);

    await waitFor(() => expect(getEnrolledLevelAsync).toHaveBeenCalled());
    expect(screen.queryByTestId("app-lock-screen")).toBeNull();
    expect(authenticateAsync).not.toHaveBeenCalled();
    expect(await readStoredLock()).toBe(true);
  });

  test("Help shows the support code only with analytics consent, a tap copies it", async () => {
    await storeSettings(true);
    authenticateAsync.mockResolvedValueOnce({
      success: false,
      error: "user_cancel",
    });
    const withoutConsent = await renderWithFlags(NO_FLAGS);
    await withoutConsent.findByTestId("app-lock-unlock");
    expect(withoutConsent.queryByTestId("app-lock-help")).toBeNull();
    withoutConsent.unmount();

    await storeSettings(true, true);
    authenticateAsync.mockResolvedValueOnce({
      success: false,
      error: "user_cancel",
    });
    const screen = await renderWithFlags(NO_FLAGS);
    expect(screen.queryByTestId("app-lock-support-code")).toBeNull();

    await userEvent.press(await screen.findByTestId("app-lock-help"));
    const code = screen.getByTestId("app-lock-support-code");
    expect(code).toHaveTextContent("test-distinct-id");

    await userEvent.press(code);
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith("test-distinct-id");
    expect(await screen.findByText("Code Copied")).toBeOnTheScreen();
  });

  test("settings row hides without the flag, stays while the lock is on", async () => {
    await storeSettings(false);
    const unlocked = await renderApp();
    await unlocked.findByTestId("app-lock-enabled");
    expect(unlocked.queryByTestId("app-lock")).toBeNull();
    unlocked.unmount();

    await storeSettings(true);
    const locked = await renderApp();
    expect(await locked.findByTestId("app-lock")).toHaveAccessibilityValue({
      text: "On",
    });
  });

  test("switch is off limits without a device passcode", async () => {
    await storeSettings(false);
    getEnrolledLevelAsync.mockResolvedValue(
      LocalAuthentication.SecurityLevel.NONE
    );
    const screen = await renderApp();

    expect(
      await screen.findByText(
        "Set a passcode or screen lock on this device to use App Lock."
      )
    ).toBeOnTheScreen();
    expect(screen.getByTestId("app-lock-enabled").props.disabled).toBe(true);
  });
});
