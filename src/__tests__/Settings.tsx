import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { act, render, userEvent, waitFor } from "@testing-library/react-native";
import { Alert, Appearance } from "react-native";
import Providers from "@/shell/Providers";
import Colors from "@/constants/Colors";
import { INITIAL_STATE } from "@/constants/Settings";
import { FeatureFlagsProvider } from "@/state/featureFlags";
import { STORAGE_KEY } from "@/state/settings";
import type { SupportClient } from "@/support";
import {
  createFakeSupportClient,
  resolveDevelopmentSupportClient,
} from "@/support/clients";
import { SettingsScreen } from "@/features/settings";
import noop from "lodash/noop";

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

const mockReload = jest.mocked(getPostHogTestClient().reloadFeatureFlagsAsync);

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...INITIAL_STATE,
      analyticsEnabled: true,
      actionsDone: [{ title: "onboarding", date: "2026-10-03T00:00:00.000Z" }],
    })
  );
  mockReload.mockReset();
  mockReload.mockResolvedValue({ "support-pixy": true });
});

const renderSettings = (supportClient: SupportClient) =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <Providers supportClient={supportClient}>
        <FeatureFlagsProvider options={{ enabled: true }}>
          <SettingsScreen />
        </FeatureFlagsProvider>
      </Providers>
    </ThemeProvider>
  );

describe("Support Pixy in Settings", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("user sees no development user data when support is disabled", async () => {
    const openSupport = jest.fn(() => Promise.resolve());
    const screen = await renderSettings({ enabled: false, openSupport });

    expect(screen.queryByTestId("support-pixy-card")).toBeNull();
    expect(openSupport).not.toHaveBeenCalled();

    expect(screen.queryByText("Load User Data")).toBeNull();
  });

  test("user sees approved support card in a configured development build", async () => {
    const supportClient = resolveDevelopmentSupportClient({
      isDevelopment: true,
      mode: "available",
    });

    expect(supportClient).toBeDefined();
    if (!supportClient) {
      return;
    }

    const screen = await renderSettings(supportClient);

    expect(await screen.findByTestId("support-pixy-card")).toBeOnTheScreen();
  });

  test("user cannot open support when the flag is off", async () => {
    mockReload.mockResolvedValue({ "support-pixy": false });
    const supportClient = createFakeSupportClient();
    const screen = await renderSettings(supportClient);

    await waitFor(() => expect(mockReload).toHaveBeenCalledTimes(1));

    expect(screen.queryByTestId("support-pixy-card")).toBeNull();
    expect(supportClient.attempts).toBe(0);
  });

  test("user opens support flow from the card", async () => {
    const supportClient = createFakeSupportClient();
    const screen = await renderSettings(supportClient);

    await userEvent.press(
      await screen.findByRole("button", { name: "Support Pixy" })
    );

    await waitFor(() => expect(supportClient.attempts).toBe(1));
  });

  test("contribution creates no local supporter state", async () => {
    const showAlert = jest.spyOn(Alert, "alert").mockImplementation();
    const supportClient = createFakeSupportClient();
    const screen = await renderSettings(supportClient);
    const button = await screen.findByRole("button", { name: "Support Pixy" });

    await userEvent.press(button);
    await userEvent.press(button);

    await waitFor(() => expect(supportClient.attempts).toBe(2));
    expect(showAlert).not.toHaveBeenCalled();
    expect(button).toBeEnabled();
    expect(screen.queryByTestId("support-pixy-thanks")).toBeNull();
  });

  test("user can retry a failed support flow", async () => {
    const supportClient = createFakeSupportClient("failed", "available");
    let retry: (() => void) | undefined;
    const showAlert = jest
      .spyOn(Alert, "alert")
      .mockImplementation((_title, _message, buttons) => {
        retry = buttons?.find((button) => button.text === "Retry")?.onPress;
      });
    const screen = await renderSettings(supportClient);

    await userEvent.press(
      await screen.findByRole("button", { name: "Support Pixy" })
    );

    await waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith(
        "Support unavailable",
        "Try again. Pixy remains fully usable.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Retry", onPress: expect.any(Function) },
        ]
      )
    );
    expect(screen.getByRole("button", { name: "Data" })).toBeEnabled();

    await act(() => retry?.());

    await waitFor(() => expect(supportClient.attempts).toBe(2));
  });

  test("user cannot open duplicate support flows while one is loading", async () => {
    let finishSupport: () => void = noop;
    const openSupport = jest.fn(
      () =>
        // oxlint-disable-next-line promise/avoid-new -- test needs a deferred Promise that stays pending until finishSupport() is called
        new Promise<void>((resolve) => {
          finishSupport = resolve;
        })
    );
    const screen = await renderSettings({ enabled: true, openSupport });
    const button = await screen.findByRole("button", { name: "Support Pixy" });

    await userEvent.press(button);
    await userEvent.press(button);

    expect(openSupport).toHaveBeenCalledTimes(1);

    finishSupport();
    await waitFor(() => expect(button).toBeEnabled());
  });
});

describe("Feedback in Settings", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each([
    {
      item: "Request Feature",
      placeholder: "It would be great if…",
      type: "idea",
    },
    { item: "Report Bug", placeholder: "I noticed that…", type: "issue" },
  ])(
    "user sends $type feedback from $item without picking a type",
    async ({ item, placeholder, type }) => {
      jest.spyOn(Alert, "alert").mockImplementation();
      const screen = await renderSettings({
        enabled: false,
        openSupport: () => Promise.resolve(),
      });

      await userEvent.press(screen.getByText(item));

      expect(screen.getAllByText(item)).toHaveLength(2);
      expect(screen.queryByRole("radio")).toBeNull();

      await userEvent.type(
        screen.getByPlaceholderText(placeholder),
        "Calendar export"
      );
      await userEvent.press(screen.getByTestId("feedback-modal-send"));

      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
      const [[, request]] = jest.mocked(global.fetch).mock.calls;
      expect(JSON.parse(String(request?.body))).toMatchObject({
        type,
        message: "Calendar export",
        source: "modal",
      });
    }
  );

  test("user sees store rating as last feedback item", async () => {
    const screen = await renderSettings({
      enabled: false,
      openSupport: () => Promise.resolve(),
    });

    expect(screen.getByText("Rate Pixy in the App Store")).toBeOnTheScreen();
    expect(screen.queryByText("Rate this app")).toBeNull();
  });

  test("user finds feedback, about and development items in their sections", async () => {
    mockReload.mockResolvedValue({ development: true });
    const screen = await renderSettings({
      enabled: false,
      openSupport: () => Promise.resolve(),
    });
    await screen.findByText("Development");

    expect(screen.getByText("Feedback")).toBeOnTheScreen();
    expect(screen.getByText("About")).toBeOnTheScreen();
    expect(screen.getByText("Development")).toBeOnTheScreen();
    expect(screen.getByText("Onboarding")).toBeOnTheScreen();
    expect(screen.getByText("Vote Features")).toBeOnTheScreen();
    expect(screen.getByText("What's new")).toBeOnTheScreen();
    expect(screen.getByText("Statistics for Nerds")).toBeOnTheScreen();
    expect(screen.getByText("Licenses")).toBeOnTheScreen();
  });
});

const renderWithoutFlags = async () => {
  mockReload.mockResolvedValue({});
  const screen = await renderSettings({
    enabled: false,
    openSupport: () => Promise.resolve(),
  });
  await waitFor(() => expect(mockReload).toHaveBeenCalledTimes(1));
  return screen;
};

describe("Development section in Settings", () => {
  test("user does not see development items by default", async () => {
    const screen = await renderWithoutFlags();

    expect(screen.queryByText("Development")).toBeNull();
    expect(screen.queryByText("Statistics for Nerds")).toBeNull();
  });

  test("user sees development items when the flag is on", async () => {
    mockReload.mockResolvedValue({ development: true });
    const screen = await renderSettings({
      enabled: false,
      openSupport: () => Promise.resolve(),
    });

    expect(await screen.findByText("Development")).toBeOnTheScreen();
  });

  test("user unlocks development items with 20 taps on the version", async () => {
    const screen = await renderWithoutFlags();
    const version = screen.getByTestId("settings-version");

    for (const _tap of Array.from({ length: 19 })) {
      // oxlint-disable-next-line no-await-in-loop -- taps must run one after another
      await userEvent.press(version);
    }
    expect(screen.queryByText("Development")).toBeNull();

    await userEvent.press(version);

    expect(await screen.findByText("Development")).toBeOnTheScreen();
    expect(screen.getByText("Statistics for Nerds")).toBeOnTheScreen();
  });
});

describe("Theme in Settings", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("user cycles theme through light, dark, and system", async () => {
    const setColorScheme = jest.spyOn(Appearance, "setColorScheme");
    const screen = await renderSettings(createFakeSupportClient());
    const theme = await screen.findByRole("button", { name: "Theme" });

    expect(theme).toHaveAccessibilityValue({ text: "System" });

    await userEvent.press(theme);
    expect(theme).toHaveAccessibilityValue({ text: "Light" });
    expect(setColorScheme).toHaveBeenLastCalledWith("light");

    await userEvent.press(theme);
    expect(theme).toHaveAccessibilityValue({ text: "Dark" });
    expect(setColorScheme).toHaveBeenLastCalledWith("dark");

    await userEvent.press(theme);
    expect(theme).toHaveAccessibilityValue({ text: "System" });
    expect(setColorScheme).toHaveBeenLastCalledWith("unspecified");
  });

  test("stored theme applies on launch", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...INITIAL_STATE, colorScheme: "dark" })
    );
    const setColorScheme = jest.spyOn(Appearance, "setColorScheme");
    const screen = await renderSettings(createFakeSupportClient());

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Theme" })
      ).toHaveAccessibilityValue({ text: "Dark" })
    );
    expect(setColorScheme).toHaveBeenLastCalledWith("dark");
  });
});
