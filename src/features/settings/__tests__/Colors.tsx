import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { Text } from "react-native";
import Colors from "@/constants/Colors";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider, useSettings } from "@/state/settings";
import { ColorsScreen } from "../screens/Colors";

// oxlint-disable-next-line anti-slop/no-module-mocking -- the native grouped rows have no Jest view; the stand-in renders each row as a pressable.
jest.mock("@expo/ui", () => {
  const { Pressable, Text: RNText, View } = require("react-native");
  return {
    Host: View,
    Text: RNText,
    RNHostView: View,
    FieldGroup: Object.assign((props) => <View {...props} />, {
      Section: View,
      SectionFooter: View,
    }),
    ListItem: ({ children, onPress, testID }) => (
      <Pressable testID={testID} onPress={onPress}>
        {children}
      </Pressable>
    ),
  };
});

// oxlint-disable-next-line anti-slop/no-module-mocking -- SwiftUI row layout has no Jest view; stacks render as plain views.
jest.mock("@expo/ui/swift-ui", () => {
  const { View } = require("react-native");
  return { HStack: View, Spacer: View, RNHostView: View, Image: () => null };
});

const SavedScale = () => {
  const { settings } = useSettings();
  return <Text testID="saved-scale">{settings.scaleType}</Text>;
};

const renderColors = () =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SettingsProvider>
        <AnalyticsProvider>
          <ColorsScreen />
          <SavedScale />
        </AnalyticsProvider>
      </SettingsProvider>
    </ThemeProvider>
  );

describe("Settings > Colors", () => {
  test("tapping a scale row saves it as the color scale", async () => {
    await renderColors();

    fireEvent.press(screen.getByTestId("scale-ColorBrew-RdYlGn-old"));

    await waitFor(() => {
      expect(screen.getByTestId("saved-scale")).toHaveTextContent(
        "ColorBrew-RdYlGn-old"
      );
    });
  });
});
