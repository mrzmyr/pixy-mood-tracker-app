import { describe, expect, test } from "bun:test";
import { compareGaps, findGaps, pruneBaseline } from "./check-locales";

const source = ["cancel", "clear", "done"];

describe("locale parity check", () => {
  test("passes when every gap is in the baseline", () => {
    const current = findGaps(source, { de: ["cancel", "done", "old"] });

    expect(
      compareGaps(current, { de: { missing: ["clear"], extra: ["old"] } })
    ).toEqual([]);
  });

  test("fails when a new key misses in a locale", () => {
    const current = findGaps(source, { de: ["cancel"], fr: source });

    const problems = compareGaps(current, {
      de: { missing: ["clear"], extra: [] },
    });

    expect(problems.map(({ status, why }) => [status, why])).toEqual([
      ["locale_key_missing", "Missing: done"],
    ]);
  });

  test("fails when a locale keeps a key removed from en.json", () => {
    const current = findGaps(source, { fr: [...source, "reset"] });

    expect(compareGaps(current, {}).map(({ status }) => status)).toEqual([
      "locale_key_extra",
    ]);
  });

  test("fails on fixed gaps until the baseline shrinks", () => {
    const baseline = { de: { missing: ["clear", "done"], extra: [] } };
    const current = findGaps(source, { de: ["cancel", "clear"] });

    expect(compareGaps(current, baseline).map(({ status }) => status)).toEqual([
      "locale_baseline_stale",
    ]);
    expect(pruneBaseline(current, baseline)).toEqual({
      de: { missing: ["done"], extra: [] },
    });
  });

  test("prune never adds new gaps", () => {
    const current = findGaps(source, { de: [], fr: [] });

    expect(
      pruneBaseline(current, { de: { missing: ["clear"], extra: [] } })
    ).toEqual({ de: { missing: ["clear"], extra: [] } });
  });
});
