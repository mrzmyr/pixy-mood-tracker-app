import { act, render } from "@testing-library/react-native";
import { LaunchSplash } from "@/shell/LaunchSplash";
import { getLaunchSplashDuration } from "@/shell/launchSplashTiming";

describe("LaunchSplash", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // The overlay is decorative and hidden from screen readers.
  test("user sees the sunburst at launch, then the app", async () => {
    const screen = await render(<LaunchSplash />);

    expect(
      screen.getByTestId("launch-splash", { includeHiddenElements: true })
    ).toBeOnTheScreen();

    await act(() => {
      jest.advanceTimersByTime(
        getLaunchSplashDuration({ reduceMotion: false })
      );
    });

    expect(
      screen.queryByTestId("launch-splash", { includeHiddenElements: true })
    ).toBeNull();
  });
});
