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

const cover = (
  count: number,
  variant: "photo" | "photos" | "pixels" = "photo"
): StorySlide => ({
  type: "cover",
  variant,
  checkIns: 7,
  photos: photos(count),
});

describe("slide duration", () => {
  test("gives each cover photo its own moment", () => {
    expect(getSlideDuration(cover(5))).toBe(17_500);
  });

  test("keeps a cover with one photo longer than other slides", () => {
    expect(getSlideDuration(cover(1))).toBe(10_000);
  });

  test("keeps the photo grid cover longer than other slides", () => {
    expect(getSlideDuration(cover(9, "photos"))).toBe(10_000);
  });

  test("keeps a cover without photos at 7 seconds", () => {
    expect(getSlideDuration(cover(0, "pixels"))).toBe(7000);
  });

  test("keeps other slides at 7 seconds", () => {
    expect(getSlideDuration({ type: "share", photos: [] })).toBe(7000);
  });
});
