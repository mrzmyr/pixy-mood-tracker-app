import { toStoreReviewPromptDates } from "../store-review-prompt-dates";

describe("toStoreReviewPromptDates()", () => {
  test("should start empty for a fresh install", () => {
    expect(toStoreReviewPromptDates({})).toEqual([]);
  });

  test("should keep the legacy single prompt date as the first date", () => {
    expect(
      toStoreReviewPromptDates({
        storeReviewPromptedAt: "2026-09-01T10:00:00.000Z",
      })
    ).toEqual(["2026-09-01T10:00:00.000Z"]);
  });

  test("should ignore a legacy `null` prompt date", () => {
    expect(toStoreReviewPromptDates({ storeReviewPromptedAt: null })).toEqual(
      []
    );
  });

  test("should keep stored dates oldest first", () => {
    expect(
      toStoreReviewPromptDates({
        storeReviewPromptDates: [
          "2026-09-01T10:00:00.000Z",
          "2025-12-01T10:00:00.000Z",
        ],
      })
    ).toEqual(["2025-12-01T10:00:00.000Z", "2026-09-01T10:00:00.000Z"]);
  });

  test("should merge the legacy date into stored dates once", () => {
    expect(
      toStoreReviewPromptDates({
        storeReviewPromptDates: ["2026-09-01T10:00:00.000Z"],
        storeReviewPromptedAt: "2026-09-01T10:00:00.000Z",
      })
    ).toEqual(["2026-09-01T10:00:00.000Z"]);
  });

  test("should drop values that are not dates", () => {
    expect(
      toStoreReviewPromptDates({
        storeReviewPromptDates: ["soon", 42, null, "2026-09-01T10:00:00.000Z"],
        storeReviewPromptedAt: "",
      })
    ).toEqual(["2026-09-01T10:00:00.000Z"]);
  });

  test("should treat a stored value that is not a list as empty", () => {
    expect(
      toStoreReviewPromptDates({ storeReviewPromptDates: "2026-09-01" })
    ).toEqual([]);
  });
});
