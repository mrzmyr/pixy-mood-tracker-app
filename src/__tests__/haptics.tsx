import { render, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import * as Haptics from "expo-haptics";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Button from "@/components/Button";
import { CloseButton } from "@/components/CloseButton";
import LinkButton from "@/components/LinkButton";
import MenuListItem from "@/components/MenuListItem";
import Colors from "@/constants/Colors";
import { Radio } from "@/features/settings/screens/Colors/Radio";

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-haptics is a native module; the test asserts on its calls
jest.mock("expo-haptics", () => ({
  __esModule: true,
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: "medium" },
  NotificationFeedbackType: { Success: "success" },
}));

const expectSilent = () => {
  expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  expect(Haptics.impactAsync).not.toHaveBeenCalled();
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
};

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

describe("haptics", () => {
  beforeEach(() => jest.clearAllMocks());

  test("plain button press stays silent and runs onPress", async () => {
    const onPress = jest.fn();
    const { getByTestId } = await render(
      withTheme(
        <Button testID="btn" onPress={onPress}>
          Go
        </Button>
      )
    );
    await fireEvent.press(getByTestId("btn"));
    expect(onPress).toHaveBeenCalledTimes(1);
    expectSilent();
  });

  test("disabled button press stays silent and skips onPress", async () => {
    const onPress = jest.fn();
    const { getByTestId } = await render(
      withTheme(
        <Button testID="btn" disabled onPress={onPress}>
          Go
        </Button>
      )
    );
    await fireEvent.press(getByTestId("btn"));
    expect(onPress).not.toHaveBeenCalled();
    expectSilent();
  });

  test("link button, close button and menu item stay silent", async () => {
    const onLink = jest.fn();
    const onClose = jest.fn();
    const onMenu = jest.fn();
    const { getByTestId } = await render(
      withTheme(
        <>
          <LinkButton testID="link" onPress={onLink}>
            Link
          </LinkButton>
          <CloseButton testID="close" onPress={onClose} />
          <MenuListItem testID="menu" title="Item" onPress={onMenu} />
        </>
      )
    );
    await fireEvent.press(getByTestId("link"));
    await fireEvent.press(getByTestId("close"));
    await fireEvent.press(getByTestId("menu"));
    expect(onLink).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onMenu).toHaveBeenCalledTimes(1);
    expectSilent();
  });

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
