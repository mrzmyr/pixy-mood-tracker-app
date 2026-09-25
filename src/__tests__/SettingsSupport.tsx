import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { act, render, userEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import Providers from "@/components/Providers";
import Colors from "@/constants/Colors";
import type { SupportClient } from "@/support";
import {
  createFakeSupportClient,
  resolveDevelopmentSupportClient,
} from "@/support/clients";
import { SettingsScreen } from "@/screens/Settings";
import noop from "lodash/noop";

// oxlint-disable-next-line anti-slop/no-module-mocking -- lucide-react-native renders native SVG components that Jest cannot render
jest.mock("lucide-react-native", () => ({
  Tag: () => null,
}));

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

const navigation = {
  navigate: jest.fn(),
};

const renderSettings = (supportClient: SupportClient) =>
  render(
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <Providers supportClient={supportClient}>
        <SettingsScreen
          // SAFETY: SettingsScreen only calls navigation.navigate, which the mock provides.
          navigation={navigation as never}
          route={{ key: "settings", name: "Settings" }}
        />
      </Providers>
    </NavigationContainer>
  );

describe("Support Pixy in Settings", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("user sees no support card when support is disabled", async () => {
    const openSupport = jest.fn(() => Promise.resolve());
    const screen = await renderSettings({ enabled: false, openSupport });

    expect(screen.queryByTestId("support-pixy-card")).toBeNull();
    expect(openSupport).not.toHaveBeenCalled();

    const testIds = screen
      .queryAllByTestId(/./u)
      .map((element) => element.props.testID);
    expect(testIds.indexOf("settings-version")).toBeLessThan(
      testIds.indexOf("settings-development-user-data")
    );
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

    const testIds = screen
      .queryAllByTestId(/./u)
      .map((element) => element.props.testID);
    expect(testIds.indexOf("settings-development-user-data")).toBeLessThan(
      testIds.indexOf("support-pixy-card")
    );
    expect(testIds.indexOf("support-pixy-card")).toBeLessThan(
      testIds.indexOf("settings-version")
    );
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
