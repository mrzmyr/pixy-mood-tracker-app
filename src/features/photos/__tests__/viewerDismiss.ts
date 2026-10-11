import { shouldDismissPhoto } from "../viewerDismiss";

const screenHeight = 800;

describe("viewer swipe to close", () => {
  test("slow short drag springs back", () => {
    expect(
      shouldDismissPhoto({ translationY: 150, velocityY: 200, screenHeight })
    ).toBe(false);
    expect(
      shouldDismissPhoto({ translationY: -150, velocityY: -200, screenHeight })
    ).toBe(false);
  });

  test("slow long drag closes, down and up", () => {
    expect(
      shouldDismissPhoto({ translationY: 250, velocityY: 0, screenHeight })
    ).toBe(true);
    expect(
      shouldDismissPhoto({ translationY: -250, velocityY: 0, screenHeight })
    ).toBe(true);
  });

  test("fast short flick closes, down and up", () => {
    expect(
      shouldDismissPhoto({ translationY: 40, velocityY: 1500, screenHeight })
    ).toBe(true);
    expect(
      shouldDismissPhoto({ translationY: -40, velocityY: -1500, screenHeight })
    ).toBe(true);
  });

  test("fast flick back toward the start keeps the viewer open", () => {
    expect(
      shouldDismissPhoto({ translationY: 300, velocityY: -1500, screenHeight })
    ).toBe(false);
    expect(
      shouldDismissPhoto({ translationY: -300, velocityY: 1500, screenHeight })
    ).toBe(false);
  });
});
