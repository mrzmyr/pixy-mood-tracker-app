import { fireEvent, render, screen } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/colors";
import Clock from "../components/clock.android";

// The time dialog comes from the manual mock in
// src/__mocks__/@expo/ui/community/datetime-picker.js.

const renderClock = async () => {
  const onChange = jest.fn();
  await render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <Clock timeDate={new Date(2026, 9, 6, 20, 0)} onChange={onChange} />
    </ThemeProvider>
  );
  return { onChange };
};

describe("Android reminder clock", () => {
  test("opens the time dialog only after a press", async () => {
    await renderClock();

    expect(screen.queryByTestId("time-picker-dialog")).toBeNull();
    await fireEvent.press(screen.getByTestId("reminder-time"));

    expect(screen.getByTestId("time-picker-dialog")).toBeTruthy();
  });

  test("reports the picked time and closes the dialog", async () => {
    const { onChange } = await renderClock();
    const picked = new Date(2026, 9, 6, 7, 30);

    await fireEvent.press(screen.getByTestId("reminder-time"));
    await fireEvent(
      screen.getByTestId("time-picker-dialog"),
      "valueChange",
      { nativeEvent: { timestamp: picked.getTime(), utcOffset: 0 } },
      picked
    );

    expect(onChange).toHaveBeenCalledWith(picked);
    expect(screen.queryByTestId("time-picker-dialog")).toBeNull();
  });

  test("keeps the time when the dialog is dismissed", async () => {
    const { onChange } = await renderClock();

    await fireEvent.press(screen.getByTestId("reminder-time"));
    await fireEvent(screen.getByTestId("time-picker-dialog"), "dismiss");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId("time-picker-dialog")).toBeNull();
  });
});
