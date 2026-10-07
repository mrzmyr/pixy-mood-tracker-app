import { getBarFraction, getMaxCount } from "../barFraction";

describe("getBarFraction()", () => {
  test("highest count fills the bar and the others scale to it", () => {
    expect(getBarFraction(8, 8)).toBe(1);
    expect(getBarFraction(4, 8)).toBe(0.5);
    expect(getBarFraction(1, 8)).toBe(0.125);
  });

  test("equal counts give equal bars", () => {
    const rows = [{ count: 3 }, { count: 3 }, { count: 3 }];
    const max = getMaxCount(rows);

    expect(rows.map((row) => getBarFraction(row.count, max))).toEqual([
      1, 1, 1,
    ]);
  });

  test("one row fills the bar", () => {
    expect(getBarFraction(5, getMaxCount([{ count: 5 }]))).toBe(1);
  });

  test("zero counts give empty bars, never NaN", () => {
    const rows = [{ count: 0 }, { count: 0 }];
    const max = getMaxCount(rows);

    expect(rows.map((row) => getBarFraction(row.count, max))).toEqual([0, 0]);
    expect(getBarFraction(0, 4)).toBe(0);
    expect(getBarFraction(2, 0)).toBe(0);
  });

  test("count above max stays inside the bar", () => {
    expect(getBarFraction(9, 4)).toBe(1);
  });
});

describe("getMaxCount()", () => {
  test("returns the highest count whatever the row order", () => {
    expect(getMaxCount([{ count: 2 }, { count: 7 }, { count: 4 }])).toBe(7);
  });

  test("returns 0 without rows", () => {
    expect(getMaxCount([])).toBe(0);
  });
});
