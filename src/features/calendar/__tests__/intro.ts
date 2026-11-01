import { act, renderHook } from "@testing-library/react-native";
import {
  getIntroOrigin,
  getPixelIntroStyle,
  playCalendarIntro,
  queueCalendarIntro,
  useCalendarIntro,
} from "../intro";

const delayOf = (style: ReturnType<typeof getPixelIntroStyle>) =>
  style && "animationDelay" in style ? style.animationDelay : null;

describe("calendar intro", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(async () => {
    await act(() => {
      jest.runAllTimers();
    });
    jest.useRealTimers();
  });

  test("hides pixels until the list knows its top row", async () => {
    const { result } = await renderHook(() => useCalendarIntro());

    await act(() => {
      queueCalendarIntro();
    });

    expect(result.current.phase).toBe("hidden");
    expect(getPixelIntroStyle(result.current, "2026-10-12")).toEqual({
      opacity: 0,
    });
  });

  test("assembles pixels in reading order from the top row", async () => {
    const { result } = await renderHook(() => useCalendarIntro());

    await act(() => {
      queueCalendarIntro();
      playCalendarIntro({ origin: "2026-09-01", lastDate: "2026-10-31" });
    });

    const first = delayOf(getPixelIntroStyle(result.current, "2026-09-01"));
    const next = delayOf(getPixelIntroStyle(result.current, "2026-09-02"));
    const later = delayOf(getPixelIntroStyle(result.current, "2026-10-01"));
    expect(first).not.toBeNull();
    expect(next).toBeGreaterThan(first ?? 0);
    expect(later).toBeGreaterThan(next ?? 0);
    // Above the screen: no animation.
    expect(getPixelIntroStyle(result.current, "2026-08-31")).toBeNull();
  });

  test("ends after the pixels and the chrome fade", async () => {
    const { result } = await renderHook(() => useCalendarIntro());

    await act(() => {
      queueCalendarIntro();
      playCalendarIntro({ origin: "2026-09-01", lastDate: "2026-10-31" });
    });
    await act(() => {
      jest.runAllTimers();
    });

    expect(result.current.phase).toBe("off");
    expect(getPixelIntroStyle(result.current, "2026-09-01")).toBeNull();
  });

  test("shows the calendar when the list never reports its layout", async () => {
    const { result } = await renderHook(() => useCalendarIntro());

    await act(() => {
      queueCalendarIntro();
    });
    await act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.phase).toBe("off");
  });

  test("plays only after onboarding queued it", async () => {
    const { result } = await renderHook(() => useCalendarIntro());

    await act(() => {
      playCalendarIntro({ origin: "2026-09-01", lastDate: "2026-10-31" });
    });

    expect(result.current.phase).toBe("off");
  });
});

describe("getIntroOrigin", () => {
  const geometry = { titleHeight: 50, weekHeight: 54, locale: "en" };

  test("starts at the month's first day when its title is on screen", () => {
    expect(
      getIntroOrigin({
        ...geometry,
        monthDate: "2026-09-01",
        weeks: 5,
        hiddenHeight: 20,
      })
    ).toBe("2026-09-01");
  });

  test("starts at the first partly visible row", () => {
    // Title (50) and one row (54) above the screen, the second row cut.
    expect(
      getIntroOrigin({
        ...geometry,
        monthDate: "2026-09-01",
        weeks: 5,
        hiddenHeight: 120,
      })
    ).toBe("2026-09-06");
  });

  test("moves to the next month when the whole month is above the screen", () => {
    expect(
      getIntroOrigin({
        ...geometry,
        monthDate: "2026-09-01",
        weeks: 5,
        hiddenHeight: 400,
      })
    ).toBe("2026-10-01");
  });
});
