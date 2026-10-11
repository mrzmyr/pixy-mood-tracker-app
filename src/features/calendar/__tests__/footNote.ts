import {
  FOOT_NOTE_COUNT,
  pickNextFootNote,
  updateFootNote,
} from "../screens/Calendar/footNote";

const hidden = { index: 0, isRevealed: false };

describe("pickNextFootNote", () => {
  it("never repeats the current note", () => {
    for (const value of [0, 0.5, 0.9999]) {
      for (let current = 0; current < FOOT_NOTE_COUNT; current += 1) {
        const next = pickNextFootNote(current, () => value);
        expect(next).not.toBe(current);
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThan(FOOT_NOTE_COUNT);
      }
    }
  });
});

describe("updateFootNote", () => {
  it("swaps the note after it was revealed and hidden again", () => {
    const revealed = updateFootNote(hidden, 60);
    expect(revealed).toEqual({ index: 0, isRevealed: true });

    const stillVisible = updateFootNote(revealed, 10);
    expect(stillVisible.index).toBe(0);

    const swapped = updateFootNote(stillVisible, 0, () => 0);
    expect(swapped).toEqual({ index: 1, isRevealed: false });
  });

  it("keeps the note when the user does not pull far enough", () => {
    const peeked = updateFootNote(hidden, 20);
    expect(updateFootNote(peeked, 0)).toBe(hidden);
  });
});
