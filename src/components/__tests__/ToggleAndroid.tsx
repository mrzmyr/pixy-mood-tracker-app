import { fireEvent, render } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { Pressable } from "react-native";

import Toggle from "@/components/Toggle.android";
import Colors from "@/constants/Colors";

// oxlint-disable-next-line anti-slop/no-module-mocking -- Compose views have no Jest renderer; the stand-ins keep the host's props and the switch's change callback.
jest.mock("@expo/ui/jetpack-compose", () => {
  const {
    Pressable: SwitchStandIn,
    View: HostStandIn,
  } = require("react-native");
  return {
    Host: (props) => <HostStandIn testID="compose-host" {...props} />,
    Switch: ({ value, enabled, onCheckedChange }) => (
      <SwitchStandIn
        testID="material-switch"
        disabled={!enabled}
        onPress={() => onCheckedChange(!value)}
      />
    ),
  };
});

// The app wraps every screen in its theme; Toggle may read colors from it.
const renderInTheme = (element: React.ReactElement) =>
  render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      {element}
    </ThemeProvider>
  );

describe("Android Toggle", () => {
  test("keeps the touch when it sits in a pressable row", async () => {
    const onValueChange = jest.fn();
    const screen = await renderInTheme(
      <Pressable testID="row">
        <Toggle value={false} onValueChange={onValueChange} testID="toggle" />
      </Pressable>
    );

    // React Native gives the touch to the deepest element that asks for it.
    // The row must not win: Android then cancels the switch's tap.
    const host = screen.getByTestId("compose-host");
    expect(host.props.onStartShouldSetResponder()).toBe(true);
    expect(host.props.onResponderTerminationRequest()).toBe(false);
  });

  test("a tap on the switch passes the new value", async () => {
    const onValueChange = jest.fn();
    const screen = await renderInTheme(
      <Toggle value={false} onValueChange={onValueChange} />
    );

    fireEvent.press(screen.getByTestId("material-switch"));

    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  test("TalkBack activate flips the value", async () => {
    const onValueChange = jest.fn();
    const screen = await renderInTheme(
      <Toggle value={false} onValueChange={onValueChange} testID="toggle" />
    );

    fireEvent(screen.getByTestId("toggle"), "accessibilityAction", {
      nativeEvent: { actionName: "activate" },
    });

    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  test("TalkBack activate does nothing while disabled", async () => {
    const onValueChange = jest.fn();
    const screen = await renderInTheme(
      <Toggle value disabled onValueChange={onValueChange} testID="toggle" />
    );

    fireEvent(screen.getByTestId("toggle"), "accessibilityAction", {
      nativeEvent: { actionName: "activate" },
    });

    expect(onValueChange).not.toHaveBeenCalled();
  });
});
