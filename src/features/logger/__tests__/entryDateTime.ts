import { clampToNow, withPickedDay } from "../entryDateTime";

describe("clampToNow()", () => {
  const now = new Date(2026, 9, 17, 12, 0);

  test("keeps a past time", () => {
    const past = new Date(2026, 9, 16, 20, 30);

    expect(clampToNow(past, now)).toEqual(past);
  });

  test("turns a future time into now", () => {
    expect(clampToNow(new Date(2026, 9, 17, 18, 0), now)).toEqual(now);
  });
});

describe("withPickedDay()", () => {
  test("moves to the picked day and keeps the time of day", () => {
    const entry = new Date(2026, 9, 17, 20, 30);
    // Material 3 date dialogs return the day as UTC midnight.
    const picked = new Date(Date.UTC(2026, 8, 3));

    const result = withPickedDay(entry, picked);

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(8);
    expect(result.getDate()).toBe(3);
    expect(result.getHours()).toBe(20);
    expect(result.getMinutes()).toBe(30);
  });
});
