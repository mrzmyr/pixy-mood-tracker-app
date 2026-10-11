import { MAX_TAGS } from "@/constants/Config";
import { getTagLimit } from "../tagLimit";
import type { Tag } from "../TagsProvider";

const makeTags = (active: number, archived: number): Tag[] => [
  ...Array.from({ length: active }, (_, index) => ({
    id: `active-${index}`,
    title: `Active ${index}`,
    color: "blue" as const,
  })),
  ...Array.from({ length: archived }, (_, index) => ({
    id: `archived-${index}`,
    title: `Archived ${index}`,
    color: "red" as const,
    isArchived: true,
  })),
];

describe("getTagLimit", () => {
  it("is not reached below the limit", () => {
    const limit = getTagLimit(makeTags(MAX_TAGS - 1, 0));
    expect(limit.reached).toBe(false);
    expect(limit.remaining).toBe(1);
  });

  it("is reached exactly at the limit", () => {
    const limit = getTagLimit(makeTags(MAX_TAGS, 0));
    expect(limit.reached).toBe(true);
    expect(limit.remaining).toBe(0);
  });

  it("counts archived tags toward the limit", () => {
    const limit = getTagLimit(makeTags(MAX_TAGS - 3, 3));
    expect(limit.reached).toBe(true);
    expect(limit.archivedCount).toBe(3);
  });

  it("stays open when only active tags would fill it but the rest is free", () => {
    const limit = getTagLimit(makeTags(MAX_TAGS - 4, 3));
    expect(limit.reached).toBe(false);
    expect(limit.remaining).toBe(1);
  });

  it("never reports negative remaining slots", () => {
    expect(getTagLimit(makeTags(MAX_TAGS + 2, 0)).remaining).toBe(0);
  });
});
