import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { useState } from "react";
import Colors from "@/constants/colors";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RolePicker } from "../components/role-picker";
import type { RolePreset } from "../role-presets";

const Picker = () => {
  const [role, setRole] = useState<RolePreset | undefined>("friend");
  return <RolePicker value={role} onChange={setRole} testID="person-role" />;
};

const renderPicker = () =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}
      >
        <SettingsProvider>
          <AnalyticsProvider>
            <Picker />
          </AnalyticsProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );

describe("RolePicker", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("None clears the role", async () => {
    await renderPicker();

    await userEvent.press(screen.getByRole("menuitem", { name: "None" }));

    expect(
      screen.getByRole("menuitem", { name: "None" }).props.accessibilityState
    ).toEqual({ checked: true });
  });

  test("a missing role is requested as feedback and keeps the current role", async () => {
    await renderPicker();

    await userEvent.press(
      screen.getByRole("menuitem", { name: "Request a Role…" })
    );
    await userEvent.type(
      await screen.findByTestId("request-role-word"),
      "Neighbor"
    );
    await userEvent.press(screen.getByTestId("request-role-send"));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [[, request]] = jest.mocked(global.fetch).mock.calls;
    expect(JSON.parse(String(request?.body))).toMatchObject({
      type: "role",
      source: "people",
      message: "Neighbor",
    });
    expect(
      screen.getByRole("menuitem", { name: "Friend" }).props.accessibilityState
    ).toEqual({ checked: true });
  });
});
