import { fireEvent, render, screen } from "@testing-library/react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import dayjs from "dayjs";
import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Colors from "@/constants/Colors";
import { DATE_FORMAT } from "@/constants/Config";
import CalendarDay from "@/features/calendar/screens/Calendar/CalendarDay";
import { SlideAction } from "@/features/logger/components/SlideAction";
import { SlideMoodButton } from "@/features/logger/components/SlideMoodButton";
import { EmotionButtonAdvanced } from "@/features/logger/slides/SlideEmotions/EmotionButtonAdvanced";
import { EmotionButtonBasic } from "@/features/logger/slides/SlideEmotions/EmotionButtonBasic";
import { Navigation } from "@/features/statistics/screens/StatisticsMonth/Navigation";
import { Title } from "@/features/statistics/screens/Statistics/Title";
import { SettingsProvider } from "@/state/settings";
import { EMOTIONS } from "@/features/logger/config";

// oxlint-disable-next-line anti-slop/no-module-mocking -- gesture-handler native module is absent in Jest; RectButton becomes a plain Pressable.
jest.mock("react-native-gesture-handler", () => ({
  __esModule: true,
  RectButton: jest.requireActual("react-native").Pressable,
}));

const wrap = (ui: React.ReactElement) =>
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
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <SettingsProvider>{ui}</SettingsProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );

const labelOf = async (role: "button") => {
  const element = await screen.findByRole(role);
  return String(element.props.accessibilityLabel);
};

const EMOTION = EMOTIONS.find((e) => e.disabled !== true) ?? EMOTIONS[0];

describe("calendar day", () => {
  const today = dayjs().format(DATE_FORMAT);
  const tomorrow = dayjs().add(1, "day").format(DATE_FORMAT);
  const yesterday = dayjs().subtract(1, "day").format(DATE_FORMAT);
  const props = { isFiltered: false, isFiltering: false, onPress: jest.fn() };

  test("names date, mood and today; selected marks today", async () => {
    await wrap(<CalendarDay {...props} dateString={today} rating="good" />);

    const day = await screen.findByRole("button");
    const label = String(day.props.accessibilityLabel);
    expect(label).toContain(String(dayjs().year()));
    expect(label.split(", ").length).toBeGreaterThanOrEqual(3);
    expect(day.props.accessibilityState).toEqual({
      disabled: false,
      selected: true,
    });
  });

  test("past day without entry names the date only and is not selected", async () => {
    await wrap(<CalendarDay {...props} dateString={yesterday} />);

    const day = await screen.findByRole("button");
    expect(day.props.accessibilityState).toEqual({
      disabled: false,
      selected: false,
    });
    const withMood = String(day.props.accessibilityLabel);

    await screen.unmount();
    await wrap(<CalendarDay {...props} dateString={yesterday} rating="good" />);
    const rated = await screen.findByRole("button");
    expect(String(rated.props.accessibilityLabel)).not.toBe(withMood);
    expect(String(rated.props.accessibilityLabel)).toContain(withMood);
  });

  test("future day is disabled", async () => {
    await wrap(<CalendarDay {...props} dateString={tomorrow} />);

    const day = await screen.findByRole("button");
    expect(day.props.accessibilityState.disabled).toBe(true);
  });
});

const MoodHarness = () => {
  const [selected, setSelected] = useState(false);
  return (
    <SlideMoodButton
      rating="good"
      selected={selected}
      onPress={() => setSelected(true)}
    />
  );
};

describe("mood and emotion choices", () => {
  test("mood button is a radio whose selected state follows presses", async () => {
    await wrap(<MoodHarness />);

    const radio = await screen.findByRole("radio");
    expect(radio.props.accessibilityLabel).toBeTruthy();
    expect(radio.props.accessibilityState.selected).toBe(false);

    await fireEvent.press(radio);

    const after = await screen.findByRole("radio");
    expect(after.props.accessibilityState.selected).toBe(true);
  });

  test.each([
    ["basic", EmotionButtonBasic],
    ["advanced", EmotionButtonAdvanced],
  ])("%s emotion tile is a checkbox that follows presses", async (_, Tile) => {
    const Harness = () => {
      const [selected, setSelected] = useState(false);
      return (
        <Tile
          emotion={EMOTION}
          selected={selected}
          onPress={() => setSelected((s) => !s)}
        />
      );
    };
    await wrap(<Harness />);

    const box = await screen.findByRole("checkbox", { name: EMOTION.label });
    expect(box.props.accessibilityState.checked).toBe(false);

    await fireEvent.press(box);

    const after = await screen.findByRole("checkbox", { name: EMOTION.label });
    expect(after.props.accessibilityState.checked).toBe(true);
  });
});

describe("icon buttons and headings", () => {
  test("logger action names differ for next and save", async () => {
    await wrap(<SlideAction type="next" />);
    const next = await labelOf("button");
    await screen.unmount();

    await wrap(<SlideAction type="save" />);
    const save = await labelOf("button");

    expect(next).toBeTruthy();
    expect(save).toBeTruthy();
    expect(next).not.toBe(save);
  });

  test("month navigation names the target month and fires its handler", async () => {
    const onPrev = jest.fn();
    const onNext = jest.fn();
    await wrap(
      <Navigation
        prevMonth={dayjs("2026-09-01")}
        nextMonth={dayjs("2026-11-01")}
        onPrev={onPrev}
        onNext={onNext}
        prevMonthDisabled={false}
        nextMonthDisabled
      />
    );

    const [prev, next] = await screen.findAllByRole("button");
    expect(String(prev.props.accessibilityLabel)).toContain("2026");
    expect(String(prev.props.accessibilityLabel)).toContain("September");
    expect(String(next.props.accessibilityLabel)).toContain("November");
    expect(next.props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(prev);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  test("statistics title is a header", async () => {
    await wrap(<Title>Mood</Title>);

    expect(await screen.findByRole("header", { name: "Mood" })).toBeTruthy();
  });
});
