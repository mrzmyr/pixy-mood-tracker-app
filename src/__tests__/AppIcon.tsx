import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { render, userEvent, waitFor } from "@testing-library/react-native";
import { Alert, Platform } from "react-native";
import { setAlternateAppIcon } from "expo-alternate-app-icons";
import Providers from "@/shell/Providers";
import Colors from "@/constants/Colors";
import { INITIAL_STATE } from "@/constants/Settings";
import { FeatureFlagsProvider } from "@/state/featureFlags";
import { STORAGE_KEY } from "@/state/settings";
import { createFakeSupportClient } from "@/support/clients";
import { AppIconScreen } from "@/features/settings";

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

const mockReload = jest.mocked(getPostHogTestClient().reloadFeatureFlagsAsync);
const mockSetIcon = jest.mocked(setAlternateAppIcon);

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
  mockSetIcon.mockClear();
});

const renderAppIcon = () =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <Providers supportClient={createFakeSupportClient()}>
        <FeatureFlagsProvider options={{ enabled: true }}>
          <AppIconScreen />
        </FeatureFlagsProvider>
      </Providers>
    </ThemeProvider>
  );

describe("Settings > App Icon", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("user sees new icons locked when the flag is off", async () => {
    mockReload.mockResolvedValue({ "app-icons": false });
    const screen = await renderAppIcon();
    await waitFor(() => expect(mockReload).toHaveBeenCalledTimes(1));

    expect(screen.getByTestId("app-icon-default")).toBeSelected();
    expect(screen.getByTestId("app-icon-sunburst")).toBeDisabled();
    expect(screen.getByTestId("app-icon-sunburst-inverse")).toBeDisabled();
    expect(screen.getByTestId("app-icon-locked-info")).toBeOnTheScreen();

    await userEvent.press(screen.getByTestId("app-icon-sunburst"));
    expect(mockSetIcon).not.toHaveBeenCalled();
  });

  test("user selects the sunburst icon when the flag is on", async () => {
    mockReload.mockResolvedValue({ "app-icons": true });
    const screen = await renderAppIcon();
    await waitFor(() =>
      expect(screen.getByTestId("app-icon-sunburst")).toBeEnabled()
    );
    expect(screen.queryByTestId("app-icon-locked-info")).toBeNull();

    await userEvent.press(screen.getByTestId("app-icon-sunburst"));

    expect(mockSetIcon).toHaveBeenCalledWith("Sunburst");
    expect(screen.getByTestId("app-icon-sunburst")).toBeSelected();
    expect(screen.getByTestId("app-icon-default")).not.toBeSelected();
  });

  test("Android user keeps the icon when they cancel the close warning", async () => {
    mockReload.mockResolvedValue({ "app-icons": true });
    jest.replaceProperty(Platform, "OS", "android");
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation((_title, _message, buttons) => {
        buttons?.find((button) => button.style === "cancel")?.onPress?.();
      });
    const screen = await renderAppIcon();
    await waitFor(() =>
      expect(screen.getByTestId("app-icon-sunburst")).toBeEnabled()
    );

    await userEvent.press(screen.getByTestId("app-icon-sunburst"));

    expect(alert).toHaveBeenCalledWith(
      "Change App Icon?",
      expect.any(String),
      expect.any(Array)
    );
    expect(mockSetIcon).not.toHaveBeenCalled();
    expect(screen.getByTestId("app-icon-default")).toBeSelected();
  });

  test("Android user changes the icon after confirming the close warning", async () => {
    mockReload.mockResolvedValue({ "app-icons": true });
    jest.replaceProperty(Platform, "OS", "android");
    jest
      .spyOn(Alert, "alert")
      .mockImplementation((_title, _message, buttons) => {
        buttons?.find((button) => button.style !== "cancel")?.onPress?.();
      });
    const screen = await renderAppIcon();
    await waitFor(() =>
      expect(screen.getByTestId("app-icon-sunburst")).toBeEnabled()
    );

    await userEvent.press(screen.getByTestId("app-icon-sunburst"));

    expect(mockSetIcon).toHaveBeenCalledWith("Sunburst");
  });

  test("user keeps the old icon and sees an alert when the change fails", async () => {
    mockReload.mockResolvedValue({ "app-icons": true });
    mockSetIcon.mockRejectedValueOnce(new Error("not allowed"));
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    const screen = await renderAppIcon();
    await waitFor(() =>
      expect(screen.getByTestId("app-icon-sunburst-inverse")).toBeEnabled()
    );

    await userEvent.press(screen.getByTestId("app-icon-sunburst-inverse"));

    expect(alert).toHaveBeenCalledWith(
      "Icon Not Changed",
      "Pixy could not change the app icon. Try again."
    );
    expect(screen.getByTestId("app-icon-default")).toBeSelected();
  });
});
