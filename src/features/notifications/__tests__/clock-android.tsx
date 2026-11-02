import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/colors";
import Clock from "../components/clock.android";

// The native dialog has no Jest view: record what the pill asks it to show.
const openDialog = jest
  .spyOn(DateTimePickerAndroid, "open")
  .mockImplementation(() => {});

const time = new Date(2026, 9, 6, 20, 0);

const renderClock = async () => {
  const onChange = jest.fn();
  await render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <Clock timeDate={time} onChange={onChange} />
    </ThemeProvider>
  );
  return { onChange };
};

/** Presses the pill and answers the opened dialog like the user would. */
const answerDialog = async (type: "set" | "dismissed", date?: Date) => {
  await fireEvent.press(screen.getByTestId("reminder-time"));
  const [{ onChange }] = openDialog.mock.calls.at(-1) ?? [{}];
  onChange?.(
    {
      type,
      nativeEvent: { timestamp: (date ?? time).getTime(), utcOffset: 0 },
    },
    date
  );
};

describe("Android reminder clock", () => {
  beforeEach(() => openDialog.mockClear());

  test("opens the time dialog at the current time and keeps the pill", async () => {
    await renderClock();

    expect(openDialog).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId("reminder-time"));

    expect(openDialog).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "time", value: time })
    );
    expect(screen.getByTestId("reminder-time")).toBeTruthy();
  });

  test("reports the picked time", async () => {
    const { onChange } = await renderClock();
    const picked = new Date(2026, 9, 6, 7, 30);

    await answerDialog("set", picked);

    expect(onChange).toHaveBeenCalledWith(picked);
  });

  test("keeps the time when the dialog is dismissed", async () => {
    const { onChange } = await renderClock();

    await answerDialog("dismissed");

    expect(onChange).not.toHaveBeenCalled();
  });
});
