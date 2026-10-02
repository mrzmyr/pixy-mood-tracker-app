import {
  STORE_REVIEW_ENTRIES_THRESHOLD,
  shouldRequestStoreReview,
} from "../storeReview";
import type { StoreReviewInput } from "../storeReview";

const ELIGIBLE: StoreReviewInput = {
  entriesCount: STORE_REVIEW_ENTRIES_THRESHOLD,
  promptedAt: null,
  isReviewAvailable: true,
  isReviewBuild: true,
  isSettingsReady: true,
};

describe("shouldRequestStoreReview()", () => {
  test("threshold is the seventh entry", () => {
    expect(STORE_REVIEW_ENTRIES_THRESHOLD).toBe(7);
  });

  test("should prompt when the seventh entry is saved and never prompted", () => {
    expect(shouldRequestStoreReview(ELIGIBLE)).toBe(true);
  });

  test("should prompt users above the threshold who were never prompted", () => {
    expect(shouldRequestStoreReview({ ...ELIGIBLE, entriesCount: 120 })).toBe(
      true
    );
  });

  test("should not prompt below the threshold", () => {
    expect(shouldRequestStoreReview({ ...ELIGIBLE, entriesCount: 6 })).toBe(
      false
    );
  });

  test("should not prompt when already prompted", () => {
    expect(
      shouldRequestStoreReview({
        ...ELIGIBLE,
        promptedAt: "2026-09-01T10:00:00.000Z",
      })
    ).toBe(false);
  });

  test("should not prompt when the store review is not available", () => {
    expect(
      shouldRequestStoreReview({ ...ELIGIBLE, isReviewAvailable: false })
    ).toBe(false);
  });

  test("should not prompt in development or preview builds", () => {
    expect(
      shouldRequestStoreReview({ ...ELIGIBLE, isReviewBuild: false })
    ).toBe(false);
  });

  test("should not prompt before settings load or after a failed read", () => {
    expect(
      shouldRequestStoreReview({ ...ELIGIBLE, isSettingsReady: false })
    ).toBe(false);
  });
});
