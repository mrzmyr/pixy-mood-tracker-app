import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
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
    <SafeAreaProvider initialMetrics={METRICS}>
      <StoryPlayer
        slides={SLIDES}
        title="September"
        onClose={onClose}
        onSlideShown={onSlideShown}
        renderBottom={(index) => <Text>{`bottom ${index}`}</Text>}
      />
    </SafeAreaProvider>
  );
  return { onClose, onSlideShown };
};

/** Short tap at `x` points from the left edge. */
const tap = async (x: number) =>
  await fireEvent.press(screen.getByTestId("recap-story-tap"), {
    nativeEvent: { locationX: x },
  });

describe("story player", () => {
  test("tap on the right moves to the next slide", async () => {
    const { onSlideShown } = await renderPlayer();

    await tap(300);

    expect(screen.getByText("Two")).toBeTruthy();
    expect(screen.getByText("bottom 1")).toBeTruthy();
    expect(onSlideShown).toHaveBeenCalledWith(1);
  });

  test("tap on the left goes back, never before the first slide", async () => {
    const { onSlideShown } = await renderPlayer();

    await tap(300);
    await tap(40);
    await tap(40);

    expect(screen.getByText("One")).toBeTruthy();
    expect(onSlideShown.mock.calls).toEqual([[1], [0]]);
  });

  test("tap on the last slide closes the story", async () => {
    const { onClose } = await renderPlayer();

    await tap(300);
    await tap(300);
    await tap(300);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("close button closes the story", async () => {
    const { onClose } = await renderPlayer();

    await fireEvent.press(screen.getByLabelText("Close"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
