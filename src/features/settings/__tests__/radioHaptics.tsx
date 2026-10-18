import { render, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import * as Haptics from "expo-haptics";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/Colors";
import { Radio } from "../screens/Colors/Radio";

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-haptics is a native module; the test asserts on its calls
jest.mock("expo-haptics", () => ({
  __esModule: true,
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: "medium" },
  NotificationFeedbackType: { Success: "success" },
}));

const withTheme = (ui: React.ReactElement) => (
  <ThemeProvider
    value={{
      ...DefaultTheme,
      dark: false,
      colors: { ...DefaultTheme.colors, ...Colors.light },
    }}
  >
    {ui}
  </ThemeProvider>
);

describe("radio haptics", () => {
  beforeEach(() => jest.clearAllMocks());

  test("settings radio pick still plays selection haptic", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      withTheme(
        <Radio onPress={onPress}>
          <Text>Option</Text>
        </Radio>
      )
    );
    await fireEvent.press(getByText("Option"));
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
