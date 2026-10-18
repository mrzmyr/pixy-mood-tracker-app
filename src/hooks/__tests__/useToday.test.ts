import { act, renderHook } from "@testing-library/react-native";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";
import { useToday } from "../useToday";

describe("useToday()", () => {
  let emitAppState: (state: AppStateStatus) => void;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 9, 8, 21, 0) });
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_type, listener) => {
        emitAppState = listener;
        return { remove: jest.fn() };
      });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("moves to the new day when the app returns from the background", async () => {
    const hook = await renderHook(() => useToday());
    expect(hook.result.current).toBe("2026-10-08");

    // iOS suspends the app overnight: the clock moves, timers do not fire.
    jest.setSystemTime(new Date(2026, 9, 9, 8, 0));
    await act(() => emitAppState("active"));

    expect(hook.result.current).toBe("2026-10-09");
  });

  it("moves to the new day at midnight while the app stays open", async () => {
    const hook = await renderHook(() => useToday());
    expect(hook.result.current).toBe("2026-10-08");

    await act(() => jest.advanceTimersByTime(3 * 60 * 60 * 1000 + 1000));

    expect(hook.result.current).toBe("2026-10-09");
  });
});
