import { getSlideDuration } from "../story/timing";
import type { StorySlide } from "../story/types";

const photos = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    date: `2026-10-${String(index + 19)}`,
    photo: {
      id: `photo-${index}`,
      fileName: `${index}.jpg`,
      width: 100,
      height: 100,
      createdAt: "2026-10-19T10:00:00.000Z",
      source: "library" as const,
    },
  }));

const cover = (count: number): StorySlide => ({
  type: "cover",
  variant: "photo",
  checkIns: 7,
  photos: photos(count),
});

describe("slide duration", () => {
  test("gives each cover photo its own moment", () => {
    expect(getSlideDuration(cover(5))).toBe(14_000);
  });

  test("never runs a cover shorter than other slides", () => {
    expect(getSlideDuration(cover(1))).toBe(7000);
  });

  test("keeps other slides at 7 seconds", () => {
    expect(getSlideDuration({ type: "thanks" })).toBe(7000);
  });
});
