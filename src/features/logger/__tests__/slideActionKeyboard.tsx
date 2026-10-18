import { render, screen } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Colors from "@/constants/Colors";
import { SlideAction } from "../components/SlideAction";

// jest.setup.js mocks reanimated; tests swap the keyboard frame it reports.
const reanimatedMock = jest.requireMock<{
  useAnimatedKeyboard: () => {
    height: { get: () => number };
    state: { get: () => number };
  };
}>("react-native-reanimated");
const closedKeyboard = reanimatedMock.useAnimatedKeyboard;

const withKeyboardHeight = (height: number) => {
  reanimatedMock.useAnimatedKeyboard = () => ({
    height: { get: () => height },
    state: { get: () => (height > 0 ? 2 : 4) },
  });
};

const renderAction = () =>
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
          insets: { top: 0, left: 0, right: 0, bottom: 34 },
        }}
      >
        <SlideAction type="next" />
      </SafeAreaProvider>
    </ThemeProvider>
  );

// Distance the button moved up, read from the nearest ancestor transform.
const buttonLift = () => {
  let node = screen.getByTestId("logger-next").parent;
  while (node) {
    const transform = StyleSheet.flatten(node.props.style)?.transform;
    if (Array.isArray(transform)) {
      const translate = transform.find((item) => "translateY" in item);
      const translateY =
        translate && "translateY" in translate ? translate.translateY : 0;
      const lift = -Number(translateY);
      return lift === 0 ? 0 : lift;
    }
    node = node.parent;
  }
  return 0;
};

afterEach(() => {
  reanimatedMock.useAnimatedKeyboard = closedKeyboard;
});

describe("SlideAction keyboard tracking", () => {
  it("stays at the bottom while the keyboard is closed", async () => {
    await renderAction();
    expect(buttonLift()).toBe(0);
  });

  it("rises with the keyboard frame", async () => {
    withKeyboardHeight(336);
    await renderAction();
    expect(buttonLift()).toBe(Platform.OS === "ios" ? 316 : 336);
  });

  it("never drops below the bottom while the keyboard starts to open", async () => {
    withKeyboardHeight(10);
    await renderAction();
    expect(buttonLift()).toBeGreaterThanOrEqual(0);
  });
});
