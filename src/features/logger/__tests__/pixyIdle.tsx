import { act, renderHook } from "@testing-library/react-native";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";
import { usePixyIdle } from "../confirmation/usePixyIdle";
import type { PixyIdle } from "../confirmation/usePixyIdle";

/** Random source that always returns `value`. */
const fixedRandom = (value: number) => () => value;

/** Renders the hook and records every eye state, oldest first. */
const render = async ({
  isEnabled = true,
  isReducedMotion = false,
  random = fixedRandom(0.5),
}: {
  isEnabled?: boolean;
  isReducedMotion?: boolean;
  random?: () => number;
} = {}) => {
  const frames: PixyIdle[] = [];
  const hook = await renderHook(
    (props: { isEnabled: boolean }) => {
      const idle = usePixyIdle({ ...props, isReducedMotion, random });
      frames.push(idle);
      return idle;
    },
    { initialProps: { isEnabled } }
  );
  return {
    result: hook.result,
    rerender: hook.rerender,
    unmount: hook.unmount,
    frames,
  };
};

/** Step size small enough to see every blink. */
const TICK_MS = 50;

/**
 * Advances time in small steps. One big step would batch a blink's open and
 * close into one render.
 */
const wait = async (ms: number) => {
  if (ms <= 0) {
    return;
  }
  await act(() => jest.advanceTimersByTime(TICK_MS));
  await wait(ms - TICK_MS);
};

/** Number of times the eyes closed. */
const countBlinks = (frames: PixyIdle[]) =>
  frames.filter(
    (frame, index) => frame.isBlinking && !frames[index - 1]?.isBlinking
  ).length;

/** Glance sides in order, without repeats of the same glance. */
const glances = (frames: PixyIdle[]) =>
  frames
    .map((frame) => frame.look)
    .filter((look, index, looks) => look !== looks[index - 1])
    .filter((look) => look !== "center");

let changeAppState: (state: AppStateStatus) => void = () => {};

beforeEach(() => {
  // `advanceTimers` lets the async render and cleanup settle.
  jest.useFakeTimers({ advanceTimers: true });
  Object.assign(AppState, { currentState: "active" });
  jest.spyOn(AppState, "addEventListener").mockImplementation((_, handler) => {
    changeAppState = handler;
    return { remove: jest.fn() };
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("usePixyIdle()", () => {
  test("blinks again and again and opens the eyes after each blink", async () => {
    const { result, frames } = await render();

    await wait(20_000);

    expect(countBlinks(frames)).toBeGreaterThanOrEqual(3);
    await wait(1000);
    expect(result.current.isBlinking).toBe(false);
  });

  test("sometimes blinks twice in a row", async () => {
    // High values never pick a double blink, low values always do.
    const single = await render({ random: fixedRandom(0.9) });
    await wait(7000);
    const singleBlinks = countBlinks(single.frames);
    await single.unmount();

    const double = await render({ random: fixedRandom(0.1) });
    await wait(2000 + 0.1 * 4000 + 1000);

    expect(singleBlinks).toBe(1);
    expect(countBlinks(double.frames)).toBe(2);
  });

  test("glances left and right, then looks ahead again", async () => {
    const { frames } = await render();

    await wait(20_000);

    const looks = glances(frames);
    expect(looks).toEqual(expect.arrayContaining(["left", "right"]));
    // Sides alternate.
    for (const [index, look] of looks.slice(1).entries()) {
      expect(look).not.toBe(looks[index]);
    }
    const firstGlance = frames.findIndex((frame) => frame.look !== "center");
    expect(
      frames.slice(firstGlance).some((frame) => frame.look === "center")
    ).toBe(true);
  });

  test("stays still with reduced motion", async () => {
    const { frames } = await render({ isReducedMotion: true });

    await wait(60_000);

    expect(countBlinks(frames)).toBe(0);
    expect(glances(frames)).toEqual([]);
  });

  test("stays still while disabled and starts when enabled", async () => {
    const { frames, rerender } = await render({ isEnabled: false });

    await wait(60_000);
    expect(countBlinks(frames)).toBe(0);

    await rerender({ isEnabled: true });
    await wait(20_000);
    expect(countBlinks(frames)).toBeGreaterThan(0);
  });

  test("rests while the app is in the background", async () => {
    const { result, frames } = await render();

    await act(() => changeAppState("background"));
    const before = frames.length;
    await wait(60_000);

    expect(frames.length).toBe(before);
    expect(result.current).toEqual({ isBlinking: false, look: "center" });

    await act(() => changeAppState("active"));
    await wait(20_000);
    expect(countBlinks(frames.slice(before))).toBeGreaterThan(0);
  });

  test("stops all timers on unmount", async () => {
    // React and the test renderer keep their own timers: compare against a
    // Pixy that never idled.
    const still = await render({ isEnabled: false });
    await wait(5000);
    await still.unmount();
    const baseline = jest.getTimerCount();

    const idle = await render();
    await wait(5000);
    await idle.unmount();

    expect(jest.getTimerCount()).toBe(baseline);
  });
});
