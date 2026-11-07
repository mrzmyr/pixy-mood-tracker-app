import {
  formatStoryOrigin,
  getPageStep,
  getStoryCardKey,
  measureStoryCard,
  parseStoryOrigin,
  registerStoryCard,
  shouldCloseStory,
} from "../story/story-motion";

const screenHeight = 844;
const window = { width: 390, height: screenHeight };

/** A mounted card whose window frame is `frame`. */
const cardAt = ([x, y, width, height]: [number, number, number, number]) => ({
  measureInWindow: (
    report: (x: number, y: number, width: number, height: number) => void
  ) => report(x, y, width, height),
});

describe("story drag down", () => {
  test("slow short drag stays open", () => {
    expect(
      shouldCloseStory({ translationY: 120, velocityY: 300, screenHeight })
    ).toBe(false);
  });

  test("slow long drag closes", () => {
    expect(
      shouldCloseStory({ translationY: 220, velocityY: 0, screenHeight })
    ).toBe(true);
  });

  test("fast flick down closes after a short drag", () => {
    expect(
      shouldCloseStory({ translationY: 40, velocityY: 1200, screenHeight })
    ).toBe(true);
  });

  test("flick back up keeps the story after a long drag", () => {
    expect(
      shouldCloseStory({ translationY: 300, velocityY: -1200, screenHeight })
    ).toBe(false);
  });

  test("drag that ends above its start stays open", () => {
    expect(
      shouldCloseStory({ translationY: -50, velocityY: -1500, screenHeight })
    ).toBe(false);
  });
});

describe("story origin", () => {
  test("notification open without a card has no origin", () => {
    expect(parseStoryOrigin(undefined)).toBeNull();
    expect(parseStoryOrigin("")).toBeNull();
    expect(parseStoryOrigin("1,2,abc,4")).toBeNull();
    expect(parseStoryOrigin("1,2,0,4")).toBeNull();
  });

  test("card frame survives the route param", () => {
    const frame = { x: 16.4, y: 610.2, width: 358, height: 76 };
    expect(parseStoryOrigin(formatStoryOrigin(frame))).toEqual({
      x: 16,
      y: 610,
      width: 358,
      height: 76,
    });
  });
});

describe("story card on close", () => {
  const key = getStoryCardKey({
    source: "calendar",
    kind: "month",
    date: "2026-10-01",
  });

  test("card on screen gives its current frame", async () => {
    const unregister = registerStoryCard(key, cardAt([16, 400, 358, 76]));
    expect(await measureStoryCard(key, window)).toEqual({
      x: 16,
      y: 400,
      width: 358,
      height: 76,
    });
    unregister();
  });

  test("card scrolled off screen gives no frame", async () => {
    const unregister = registerStoryCard(key, cardAt([16, 900, 358, 76]));
    expect(await measureStoryCard(key, window)).toBeNull();
    unregister();
  });

  test("unmounted card gives no frame", async () => {
    registerStoryCard(key, cardAt([16, 400, 358, 76]))();
    expect(await measureStoryCard(key, window)).toBeNull();
  });
});

/** Page step of a swipe on slide `index` of three. */
const swipe = (translationY: number, velocityY: number, index = 1) =>
  getPageStep({ translationY, velocityY, screenHeight, index, count: 3 });

describe("story swipe", () => {
  test("slow short swipe stays on the slide", () => {
    expect(swipe(-80, -200)).toBe(0);
    expect(swipe(80, 200)).toBe(0);
  });

  test("slow long swipe up goes next, down goes back", () => {
    expect(swipe(-200, 0)).toBe(1);
    expect(swipe(200, 0)).toBe(-1);
  });

  test("fast flick pages after a short swipe", () => {
    expect(swipe(-30, -900)).toBe(1);
    expect(swipe(30, 900)).toBe(-1);
  });

  test("flick back against the swipe stays on the slide", () => {
    expect(swipe(-300, 900)).toBe(0);
    expect(swipe(300, -900)).toBe(0);
  });

  test("never pages before the first or after the last slide", () => {
    expect(swipe(300, 900, 0)).toBe(0);
    expect(swipe(-300, -900, 2)).toBe(0);
  });
});
