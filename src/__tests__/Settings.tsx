import { DefaultTheme, ThemeProvider } from "expo-router";
import { act, render, userEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import Providers from "@/shell/Providers";
import Colors from "@/constants/Colors";
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
        <SettingsScreen />
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

    expect(screen.getByTestId("support-pixy-card")).toBeOnTheScreen();
    expect(
      screen.getByText("Has Pixy supported your wellbeing?")
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Pixy is free to use and supported by optional contributions. If it has been useful to you, you may support its continued development."
      )
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Support Pixy" })
    ).toBeOnTheScreen();

    expect(screen.queryByText("Load User Data")).toBeNull();
  });

  test("user opens support flow from the card", async () => {
    const supportClient = createFakeSupportClient();
    const screen = await renderSettings(supportClient);

    await userEvent.press(screen.getByRole("button", { name: "Support Pixy" }));

    await waitFor(() => expect(supportClient.attempts).toBe(1));
  });

  test("contribution creates no local supporter state", async () => {
    const showAlert = jest.spyOn(Alert, "alert").mockImplementation();
    const supportClient = createFakeSupportClient();
    const screen = await renderSettings(supportClient);
    const button = screen.getByRole("button", { name: "Support Pixy" });

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

    await userEvent.press(screen.getByRole("button", { name: "Support Pixy" }));

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
    const button = screen.getByRole("button", { name: "Support Pixy" });

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
      item: "Request a feature",
      placeholder: "It would be great if…",
      type: "idea",
    },
    { item: "Report a bug", placeholder: "I noticed that…", type: "issue" },
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

  test("user finds feedback and about items in two sections only", async () => {
    const screen = await renderSettings({
      enabled: false,
      openSupport: () => Promise.resolve(),
    });

    expect(screen.getByText("Feedback")).toBeOnTheScreen();
    expect(screen.getByText("About")).toBeOnTheScreen();
    expect(screen.queryByText("Development")).toBeNull();
    expect(screen.getByText("Vote Features")).toBeOnTheScreen();
    expect(screen.getByText("What's new")).toBeOnTheScreen();
    expect(screen.getByText("Statistics for Nerds")).toBeOnTheScreen();
    expect(screen.getByText("Licenses")).toBeOnTheScreen();
  });
});
