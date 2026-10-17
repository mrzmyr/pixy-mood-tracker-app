import { fireEvent, render, screen } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/Colors";
import { EntryDateTimePicker } from "../components/EntryDateTimePicker.android";

// The dialog comes from the manual mock in
// src/__mocks__/@expo/ui/community/datetime-picker.js.

const yesterdayEvening = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  date.setHours(20, 30, 0, 0);
  return date;
};

const renderPicker = async (value: Date) => {
  const onChange = jest.fn();
  await render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <EntryDateTimePicker value={value.toISOString()} onChange={onChange} />
    </ThemeProvider>
  );
  return onChange;
};

describe("Android entry date and time", () => {
  test("date pill opens the date dialog, time pill the time dialog", async () => {
    await renderPicker(yesterdayEvening());

    expect(screen.queryByTestId("datetime-dialog-date")).toBeNull();
    await fireEvent.press(screen.getByTestId("logger-date"));
    expect(screen.getByTestId("datetime-dialog-date")).toBeTruthy();

    await fireEvent(screen.getByTestId("datetime-dialog-date"), "dismiss");
    expect(screen.queryByTestId("datetime-dialog-date")).toBeNull();

    await fireEvent.press(screen.getByTestId("logger-time"));
    expect(screen.getByTestId("datetime-dialog-time")).toBeTruthy();
  });

  test("a picked day keeps the entry's time of day", async () => {
    const entry = yesterdayEvening();
    const onChange = await renderPicker(entry);
    const twoDaysAgo = new Date(entry);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 1);
    const pickedDay = new Date(
      Date.UTC(
        twoDaysAgo.getFullYear(),
        twoDaysAgo.getMonth(),
        twoDaysAgo.getDate()
      )
    );

    await fireEvent.press(screen.getByTestId("logger-date"));
    await fireEvent(
      screen.getByTestId("datetime-dialog-date"),
      "valueChange",
      {},
      pickedDay
    );

    const saved = new Date(onChange.mock.calls[0][0]);
    expect(saved.getDate()).toBe(twoDaysAgo.getDate());
    expect(saved.getHours()).toBe(20);
    expect(saved.getMinutes()).toBe(30);
    expect(screen.queryByTestId("datetime-dialog-date")).toBeNull();
  });

  test("a picked time after now saves now", async () => {
    const onChange = await renderPicker(new Date());
    const later = new Date(Date.now() + 60 * 60 * 1000);

    await fireEvent.press(screen.getByTestId("logger-time"));
    await fireEvent(
      screen.getByTestId("datetime-dialog-time"),
      "valueChange",
      {},
      later
    );

    expect(new Date(onChange.mock.calls[0][0]).getTime()).toBeLessThan(
      later.getTime()
    );
  });
});
