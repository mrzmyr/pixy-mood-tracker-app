import { MAX_TAGS, MAX_TAGS_MORE } from "@/constants/config";
import { getTagLimit } from "../tag-limit";
import type { Tag } from "../tags-provider";

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
    const limit = getTagLimit(makeTags(MAX_TAGS - 1, 0), MAX_TAGS);
    expect(limit.reached).toBe(false);
    expect(limit.remaining).toBe(1);
  });

  it("is reached exactly at the limit", () => {
    const limit = getTagLimit(makeTags(MAX_TAGS, 0), MAX_TAGS);
    expect(limit.reached).toBe(true);
    expect(limit.remaining).toBe(0);
  });

  it("counts archived tags toward the limit", () => {
    const limit = getTagLimit(makeTags(MAX_TAGS - 3, 3), MAX_TAGS);
    expect(limit.reached).toBe(true);
    expect(limit.archivedCount).toBe(3);
  });

  it("stays open when only active tags would fill it but the rest is free", () => {
    const limit = getTagLimit(makeTags(MAX_TAGS - 4, 3), MAX_TAGS);
    expect(limit.reached).toBe(false);
    expect(limit.remaining).toBe(1);
  });

  it("never reports negative remaining slots", () => {
    expect(getTagLimit(makeTags(MAX_TAGS + 2, 0), MAX_TAGS).remaining).toBe(0);
  });

  it("stays open past the default limit with the larger limit", () => {
    const limit = getTagLimit(makeTags(MAX_TAGS, 0), MAX_TAGS_MORE);
    expect(limit.reached).toBe(false);
    expect(limit.remaining).toBe(MAX_TAGS_MORE - MAX_TAGS);
  });
});
