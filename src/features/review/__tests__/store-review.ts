import { decideStoreReview } from "../store-review";
import type { StoreReviewGate, StoreReviewMoment } from "../store-review";

const NOW = new Date("2026-10-25T12:00:00.000Z");

const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const GATE: StoreReviewGate = {
  promptDates: [],
  lastPromptAppVersion: null,
  appVersion: "1.102.0",
  now: NOW,
  isReviewAvailable: true,
  isReviewBuild: true,
  isSettingsReady: true,
};

/** Gate after one earlier prompt, long enough ago to allow the next. */
const PROMPTED_ONCE: StoreReviewGate = {
  ...GATE,
  promptDates: [daysAgo(200)],
  lastPromptAppVersion: "1.90.0",
};

type EntrySaved = Extract<StoreReviewMoment, { kind: "entry_saved" }>;

const goodSave = (
  entriesCount: number,
  overrides: Partial<Omit<EntrySaved, "kind">> = {}
): EntrySaved => ({
  kind: "entry_saved",
  entriesCount,
  rating: "very_good",
  hasNegativeEmotion: false,
  ...overrides,
});

describe("decideStoreReview()", () => {
  describe("entry saved, first prompt (entries_7)", () => {
    test("should prompt on a good save that reaches 7 entries", () => {
      expect(decideStoreReview(goodSave(7), GATE)).toBe("entries_7");
    });

    test("should prompt users above 7 entries who were never prompted", () => {
      expect(decideStoreReview(goodSave(120), GATE)).toBe("entries_7");
    });

    test("should not prompt below 7 entries", () => {
      expect(decideStoreReview(goodSave(6), GATE)).toBeNull();
    });

    test("should accept every rating from good up", () => {
      for (const rating of ["good", "very_good", "extremely_good"] as const) {
        expect(decideStoreReview(goodSave(7, { rating }), GATE)).toBe(
          "entries_7"
        );
      }
    });

    test("should not prompt after a neutral or bad save", () => {
      for (const rating of [
        "neutral",
        "bad",
        "very_bad",
        "extremely_bad",
      ] as const) {
        expect(decideStoreReview(goodSave(7, { rating }), GATE)).toBeNull();
      }
    });

    test("should not prompt after a save without a rating", () => {
      expect(decideStoreReview(goodSave(7, { rating: null }), GATE)).toBeNull();
    });

    test("should not prompt when the entry has a bad emotion", () => {
      expect(
        decideStoreReview(goodSave(7, { hasNegativeEmotion: true }), GATE)
      ).toBeNull();
    });
  });

  describe("entry saved, later prompts (good_entry_30)", () => {
    test("should prompt on a good save with 30 entries after an earlier prompt", () => {
      expect(decideStoreReview(goodSave(30), PROMPTED_ONCE)).toBe(
        "good_entry_30"
      );
    });

    test("should not prompt again below 30 entries", () => {
      expect(decideStoreReview(goodSave(29), PROMPTED_ONCE)).toBeNull();
    });

    test("should not prompt again after a neutral save", () => {
      expect(
        decideStoreReview(goodSave(40, { rating: "neutral" }), PROMPTED_ONCE)
      ).toBeNull();
    });
  });

  describe("limits", () => {
    test("should allow a second prompt 120 days after the first", () => {
      expect(
        decideStoreReview(goodSave(30), {
          ...PROMPTED_ONCE,
          promptDates: [daysAgo(120)],
        })
      ).toBe("good_entry_30");
    });

    test("should not prompt within 120 days of the last prompt", () => {
      expect(
        decideStoreReview(goodSave(30), {
          ...PROMPTED_ONCE,
          promptDates: [daysAgo(119)],
        })
      ).toBeNull();
    });

    test("should use the newest prompt for spacing, in any order", () => {
      expect(
        decideStoreReview(goodSave(30), {
          ...PROMPTED_ONCE,
          promptDates: [daysAgo(10), daysAgo(400)],
        })
      ).toBeNull();
    });

    test("should not prompt a fourth time within 365 days", () => {
      expect(
        decideStoreReview(goodSave(30), {
          ...PROMPTED_ONCE,
          promptDates: [daysAgo(364), daysAgo(243), daysAgo(122)],
        })
      ).toBeNull();
    });

    test("should prompt again once the oldest of 3 prompts is 365 days old", () => {
      expect(
        decideStoreReview(goodSave(30), {
          ...PROMPTED_ONCE,
          promptDates: [daysAgo(365), daysAgo(244), daysAgo(123)],
        })
      ).toBe("good_entry_30");
    });

    test("should not prompt twice in one app version", () => {
      expect(
        decideStoreReview(goodSave(30), {
          ...PROMPTED_ONCE,
          lastPromptAppVersion: GATE.appVersion,
        })
      ).toBeNull();
    });

    test("should not prompt when the last prompt lies in the future", () => {
      // The device clock moved back: wait instead of prompting again.
      expect(
        decideStoreReview(goodSave(30), {
          ...PROMPTED_ONCE,
          promptDates: [daysAgo(-30)],
        })
      ).toBeNull();
    });

    test("should not prompt when the store review is not available", () => {
      expect(
        decideStoreReview(goodSave(7), { ...GATE, isReviewAvailable: false })
      ).toBeNull();
    });

    test("should not prompt in development or preview builds", () => {
      expect(
        decideStoreReview(goodSave(7), { ...GATE, isReviewBuild: false })
      ).toBeNull();
    });

    test("should not prompt before settings load or after a failed read", () => {
      expect(
        decideStoreReview(goodSave(7), { ...GATE, isSettingsReady: false })
      ).toBeNull();
    });
  });
});
