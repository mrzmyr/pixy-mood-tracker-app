import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, screen, userEvent } from "@testing-library/react-native";
import {
  DefaultTheme,
  Stack,
  ThemeProvider,
  useLocalSearchParams,
} from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Text } from "react-native";
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

const RequestStub = () => {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  return <Text>{`request ${kind}`}</Text>;
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

  test("Request a Role… opens the role request, keeps the role", async () => {
    await renderRouter(
      {
        _layout: () => (
          <ThemeProvider
            value={{
              ...DefaultTheme,
              dark: false,
              colors: { ...DefaultTheme.colors, ...Colors.light },
            }}
          >
            <SettingsProvider>
              <AnalyticsProvider>
                <Stack />
              </AnalyticsProvider>
            </SettingsProvider>
          </ThemeProvider>
        ),
        index: Picker,
        request: RequestStub,
      },
      { initialUrl: "/" }
    );
    jest.useRealTimers();

    await userEvent.press(
      await screen.findByRole("menuitem", { name: "Request a Role…" })
    );

    expect(await screen.findByText("request role")).toBeOnTheScreen();
  });
});
