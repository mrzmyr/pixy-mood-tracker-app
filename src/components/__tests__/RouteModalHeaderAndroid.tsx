import { fireEvent, render } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { StyleSheet, Text } from "react-native";

import RouteModalHeader from "@/components/RouteModalHeader.android";
import Colors from "@/constants/Colors";
import { SafeAreaProvider } from "react-native-safe-area-context";

const STATUS_BAR_HEIGHT = 32;

const renderHeader = (element: React.ReactElement) =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 412, height: 915 },
        insets: { top: STATUS_BAR_HEIGHT, right: 0, bottom: 0, left: 0 },
      }}
    >
      <ThemeProvider
        value={{
          ...DefaultTheme,
          colors: { ...DefaultTheme.colors, ...Colors.light },
        }}
      >
        {element}
      </ThemeProvider>
    </SafeAreaProvider>
  );

describe("Android RouteModalHeader", () => {
  test("close icon leaves the form and action stays reachable", async () => {
    const onClose = jest.fn();
    const onSave = jest.fn();
    const screen = await renderHeader(
      <RouteModalHeader
        title="Create Tag"
        onClose={onClose}
        closeTestID="tag-cancel"
        action={
          <Text testID="tag-save" onPress={onSave}>
            Save
          </Text>
        }
      />
    );

    await fireEvent.press(screen.getByTestId("tag-cancel"));
    await fireEvent.press(screen.getByTestId("tag-save"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test("bar starts below the status bar", async () => {
    const screen = await renderHeader(
      <RouteModalHeader title="Tags" onClose={jest.fn()} />
    );

    const bar = screen.getByTestId("route-modal-header");
    const style = StyleSheet.flatten(bar.props.style);

    expect(style.paddingTop).toBe(STATUS_BAR_HEIGHT);
  });
});
