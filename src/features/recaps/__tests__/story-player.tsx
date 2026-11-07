import { fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { StoryPlayer } from "../story/story-player";
import type { PlayerSlide } from "../story/story-player";

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const SLIDES: PlayerSlide[] = ["One", "Two", "Three"].map((label) => ({
  key: label,
  theme: "night",
  content: <Text>{label}</Text>,
}));

const renderPlayer = async () => {
  const onClose = jest.fn();
  const onSlideShown = jest.fn();
  await render(
    <ThemeProvider
      value={{
        ...DefaultTheme,
        dark: false,
        colors: { ...DefaultTheme.colors, ...Colors.light },
      }}
    >
      <SafeAreaProvider initialMetrics={METRICS}>
        <StoryPlayer
          slides={SLIDES}
          onClose={onClose}
          onSlideShown={onSlideShown}
          renderBottom={(index, _theme, controls) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => controls.pause()}
            >
              <Text>{`bottom ${index}`}</Text>
            </Pressable>
          )}
        />
      </SafeAreaProvider>
    </ThemeProvider>
  );
  return { onClose, onSlideShown };
};

/** Screen reader buttons move like a swipe up or down. */
const showNext = async () =>
  await fireEvent.press(screen.getByLabelText("Next slide"));
const showPrevious = async () =>
  await fireEvent.press(screen.getByLabelText("Previous slide"));

describe("story player", () => {
  test("next moves to the next slide", async () => {
    const { onSlideShown } = await renderPlayer();

    await showNext();

    expect(screen.getByText("Two")).toBeTruthy();
    expect(screen.getByText("bottom 1")).toBeTruthy();
    expect(onSlideShown).toHaveBeenCalledWith(1);
  });

  test("previous goes back, never before the first slide", async () => {
    const { onSlideShown } = await renderPlayer();

    await showNext();
    await showPrevious();
    await showPrevious();

    expect(screen.getByText("One")).toBeTruthy();
    expect(onSlideShown.mock.calls).toEqual([[1], [0]]);
  });

  test("next on the last slide closes the story", async () => {
    const { onClose } = await renderPlayer();

    await showNext();
    await showNext();
    await showNext();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("close button closes the story", async () => {
    const { onClose } = await renderPlayer();

    await fireEvent.press(screen.getByLabelText("Close"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("tap on the slide pauses and plays, and stays on the slide", async () => {
    const { onSlideShown } = await renderPlayer();

    await fireEvent.press(screen.getByTestId("recap-story-tap"));

    expect(screen.getByLabelText("Play")).toBeTruthy();
    expect(screen.getByText("One")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("recap-story-tap"));

    expect(screen.getByLabelText("Pause")).toBeTruthy();
    expect(onSlideShown).not.toHaveBeenCalled();
  });

  test("next plays a paused story again", async () => {
    await renderPlayer();

    await fireEvent.press(screen.getByLabelText("Pause"));
    await showNext();

    expect(screen.getByText("Two")).toBeTruthy();
    expect(screen.getByLabelText("Pause")).toBeTruthy();
  });

  test("previous plays a paused story again", async () => {
    await renderPlayer();

    await showNext();
    await fireEvent.press(screen.getByLabelText("Pause"));
    await showPrevious();

    expect(screen.getByText("One")).toBeTruthy();
    expect(screen.getByLabelText("Pause")).toBeTruthy();
  });

  test("a bottom action pauses the story until play", async () => {
    await renderPlayer();

    await fireEvent.press(screen.getByText("bottom 0"));

    expect(screen.getByLabelText("Play")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Play"));

    expect(screen.getByLabelText("Pause")).toBeTruthy();
  });
});
