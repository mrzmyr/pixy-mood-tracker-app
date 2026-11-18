import { act, render, screen, userEvent } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import Colors from "@/constants/colors";
import type { Emotion } from "@/types";
import { EmotionHint, useEmotionHint } from "../emotion-hint";

const CALM: Emotion = {
  key: "calm",
  label: "Calm",
  description: "Quiet inside, no rush.",
  category: "very_good",
  mode: "basic",
  source: "custom",
  disabled: false,
};

const Harness = () => {
  const hint = useEmotionHint();
  return (
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <Pressable accessibilityRole="button" onPress={() => hint.show(CALM)}>
        <Text>Pick</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => hint.hide()}>
        <Text>Unpick</Text>
      </Pressable>
      <EmotionHint emotion={hint.emotion} />
    </ThemeProvider>
  );
};

describe("EmotionHint", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("a pick shows the description, then it goes away", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<Harness />);

    await user.press(screen.getByRole("button", { name: "Pick" }));
    expect(screen.getByText("Quiet inside, no rush.")).toBeTruthy();

    await act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(screen.queryByText("Quiet inside, no rush.")).toBeNull();
  });

  test("an unpick hides the description at once", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<Harness />);

    await user.press(screen.getByRole("button", { name: "Pick" }));
    await user.press(screen.getByRole("button", { name: "Unpick" }));

    expect(screen.queryByText("Quiet inside, no rush.")).toBeNull();
  });
});
