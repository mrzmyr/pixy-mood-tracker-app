import { getEffect } from "../correlation";
import { getDays } from "../days";
import { _generateItem } from "@/testing/log-item";
import type { LogItem } from "@/features/logs";

const days = (ratings: LogItem["rating"][], tagged: number[]) =>
  getDays(
    ratings.map((rating, index) =>
      _generateItem({
        date: `2026-09-${String(index + 1).padStart(2, "0")}`,
        rating,
        tags: tagged.includes(index) ? [{ id: "sport" }] : [],
      })
    )
  );

const hasSport = (day: ReturnType<typeof getDays>[number]) =>
  day.items.some((item) => item.tags.some((tag) => tag.id === "sport"));

describe("getEffect", () => {
  test("rates a clear lift on 5 tagged days as strong", () => {
    const ratings: LogItem["rating"][] = [
      ...Array.from({ length: 5 }, () => "very_good" as const),
      ...Array.from({ length: 10 }, (_, index) =>
        index % 2 === 0 ? ("neutral" as const) : ("good" as const)
      ),
    ];

    expect(getEffect(days(ratings, [0, 1, 2, 3, 4]), hasSport)).toEqual({
      days: 5,
      delta: 1.5,
      signal: "strong",
    });
  });

  test("stays weak with fewer than 5 days without the driver", () => {
    const ratings: LogItem["rating"][] = [
      ...Array.from({ length: 9 }, () => "very_good" as const),
      "neutral",
    ];

    expect(
      getEffect(days(ratings, [0, 1, 2, 3, 4, 5, 6, 7, 8]), hasSport).signal
    ).toBe("weak");
  });

  test("rates a difference without any spread as strong", () => {
    const ratings: LogItem["rating"][] = [
      ...Array.from({ length: 5 }, () => "very_good" as const),
      ...Array.from({ length: 10 }, () => "good" as const),
    ];

    expect(getEffect(days(ratings, [0, 1, 2, 3, 4]), hasSport).signal).toBe(
      "strong"
    );
    expect(
      getEffect(
        days(
          Array.from({ length: 15 }, () => "good" as const),
          [0, 1, 2, 3, 4]
        ),
        hasSport
      ).signal
    ).toBe("weak");
  });

  test("never trusts fewer than 5 days with the driver", () => {
    const ratings: LogItem["rating"][] = [
      ...Array.from({ length: 4 }, () => "very_good" as const),
      ...Array.from({ length: 10 }, () => "neutral" as const),
    ];

    expect(getEffect(days(ratings, [0, 1, 2, 3]), hasSport).signal).toBe(
      "weak"
    );
  });

  test("calls a noisy difference medium, not strong", () => {
    // With: 6 4 5 3 5, without: 4 3 4 2 4. Delta 1.2, score about 1.85.
    const ratings: LogItem["rating"][] = [
      "extremely_good",
      "good",
      "very_good",
      "neutral",
      "very_good",
      "good",
      "neutral",
      "good",
      "bad",
      "good",
    ];
    const effect = getEffect(days(ratings, [0, 1, 2, 3, 4]), hasSport);

    expect(effect.signal).toBe("medium");
    expect(effect.delta).toBeCloseTo(1.2);
  });
});
