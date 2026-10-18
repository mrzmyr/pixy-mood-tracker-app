import { isMostlyVisible } from "../visibility";

const viewport = { y: 100, height: 600 };

describe("isMostlyVisible", () => {
  test("counts a card with half its height on screen", () => {
    expect(isMostlyVisible({ y: 500, height: 400 }, viewport)).toBe(true);
    expect(isMostlyVisible({ y: 501, height: 400 }, viewport)).toBe(false);
  });

  test("counts cards cut off at the top the same way", () => {
    expect(isMostlyVisible({ y: -100, height: 400 }, viewport)).toBe(true);
    expect(isMostlyVisible({ y: -101, height: 400 }, viewport)).toBe(false);
  });

  test("never counts a card without height", () => {
    expect(isMostlyVisible({ y: 200, height: 0 }, viewport)).toBe(false);
  });
});
