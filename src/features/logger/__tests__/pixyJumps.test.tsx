import { act, renderHook } from "@testing-library/react-native";
import { HAPPY_JUMP_MS } from "../confirmation/motion";
import { usePixyJumps } from "../confirmation/usePixyJumps";

const render = (props: { isCelebrating: boolean; isReducedMotion: boolean }) =>
  renderHook(() => usePixyJumps(props));

beforeEach(() => {
  // `advanceTimers` lets the async render and cleanup settle.
  jest.useFakeTimers({ advanceTimers: true });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("usePixyJumps()", () => {
  test("bursts confetti on every tap and removes it when the jump ends", async () => {
    const hook = await render({ isCelebrating: true, isReducedMotion: false });
    expect(hook.result.current.hasConfetti).toBe(false);

    const tapAndWait = async (tap: number) => {
      await act(() => hook.result.current.tap());
      expect(hook.result.current).toMatchObject({
        jumps: tap,
        isJoyful: true,
        hasConfetti: true,
      });

      await act(() => jest.advanceTimersByTime(HAPPY_JUMP_MS));
      expect(hook.result.current).toMatchObject({
        isJoyful: false,
        hasConfetti: false,
      });
    };

    await tapAndWait(1);
    await tapAndWait(2);
  });

  test("a tap during a jump restarts the burst for its full length", async () => {
    const hook = await render({ isCelebrating: true, isReducedMotion: false });

    await act(() => hook.result.current.tap());
    await act(() => jest.advanceTimersByTime(HAPPY_JUMP_MS / 2));
    await act(() => hook.result.current.tap());
    await act(() => jest.advanceTimersByTime(HAPPY_JUMP_MS / 2));
    expect(hook.result.current.hasConfetti).toBe(true);

    await act(() => jest.advanceTimersByTime(HAPPY_JUMP_MS / 2));
    expect(hook.result.current.hasConfetti).toBe(false);
  });

  test("hard days jump without laugh or confetti", async () => {
    const hook = await render({ isCelebrating: false, isReducedMotion: false });

    await act(() => hook.result.current.tap());
    expect(hook.result.current).toMatchObject({
      jumps: 1,
      isJoyful: false,
      hasConfetti: false,
    });
  });

  test("reduced motion laughs without confetti", async () => {
    const hook = await render({ isCelebrating: true, isReducedMotion: true });

    await act(() => hook.result.current.tap());
    expect(hook.result.current).toMatchObject({
      isJoyful: true,
      hasConfetti: false,
    });
  });
});
