import {
  arrangeTags,
  GENERAL_CATEGORY_ID,
  groupTagsByCategory,
  moveTag,
  normalizeTagCategories,
  reorderCategories,
  toTagArrangement,
  toTagCategoryRows,
} from "../tagCategories";
import type { Tag, TagCategory } from "../TagsProvider";

const tag = (id: string, categoryId?: string, isArchived = false): Tag => ({
  id,
  title: `tag ${id}`,
  color: "slate",
  categoryId,
  isArchived,
});

const general: TagCategory = { id: GENERAL_CATEGORY_ID, title: "General" };
const work: TagCategory = { id: "work", title: "Work" };
const fun: TagCategory = { id: "fun", title: "Fun" };

const ids = (tags: Tag[]) => tags.map((item) => item.id);

describe("normalizeTagCategories()", () => {
  test("puts all tags of data from before categories into General", () => {
    const result = normalizeTagCategories(
      [tag("1"), tag("2")],
      undefined,
      "General"
    );

    expect(result.categories).toEqual([general]);
    expect(result.tags.map((item) => item.categoryId)).toEqual([
      GENERAL_CATEGORY_ID,
      GENERAL_CATEGORY_ID,
    ]);
  });

  test("moves tags of unknown categories to General and keeps known ones", () => {
    const result = normalizeTagCategories(
      [tag("1", "work"), tag("2", "deleted")],
      [general, work],
      "General"
    );

    expect(result.tags.map((item) => item.categoryId)).toEqual([
      "work",
      GENERAL_CATEGORY_ID,
    ]);
  });

  test("restores a missing General first and drops duplicate categories", () => {
    const result = normalizeTagCategories([], [work, work], "General");
    expect(result.categories).toEqual([general, work]);
  });
});

describe("groupTagsByCategory()", () => {
  test("groups in category order, keeps tag order and empty categories", () => {
    const sections = groupTagsByCategory(
      [tag("1", "work"), tag("2", GENERAL_CATEGORY_ID), tag("3", "work")],
      [work, general, fun]
    );

    expect(
      sections.map((section) => [section.category.id, ids(section.tags)])
    ).toEqual([
      ["work", ["1", "3"]],
      [GENERAL_CATEGORY_ID, ["2"]],
      ["fun", []],
    ]);
  });
});

describe("arrangeTags()", () => {
  test("applies order and category, unlisted tags follow unchanged", () => {
    const archived = tag("3", "work", true);
    const result = arrangeTags(
      [tag("1", GENERAL_CATEGORY_ID), tag("2", GENERAL_CATEGORY_ID), archived],
      [
        { categoryId: GENERAL_CATEGORY_ID, tagIds: ["2"] },
        { categoryId: "work", tagIds: ["1", "x", "1"] },
      ]
    );

    expect(ids(result)).toEqual(["2", "1", "3"]);
    expect(result.map((item) => item.categoryId)).toEqual([
      GENERAL_CATEGORY_ID,
      "work",
      "work",
    ]);
    expect(result[2]).toBe(archived);
  });
});

describe("toTagArrangement()", () => {
  test("a tag dropped under another header joins that category", () => {
    const rows = toTagCategoryRows(
      groupTagsByCategory(
        [tag("1", GENERAL_CATEGORY_ID), tag("2", GENERAL_CATEGORY_ID)],
        [general, work]
      )
    );
    // Rows: general header, 1, 2, work header, empty. Drag "1" below "work".
    const dragged = [rows[0], rows[2], rows[3], rows[1], rows[4]];

    expect(toTagArrangement(dragged)).toEqual([
      { categoryId: GENERAL_CATEGORY_ID, tagIds: ["2"] },
      { categoryId: "work", tagIds: ["1"] },
    ]);
  });

  test("tags above the first header join the first category", () => {
    const rows = toTagCategoryRows(
      groupTagsByCategory([tag("1", "work")], [general, work])
    );
    // Rows: general header, empty, work header, 1. Drag "1" to the top.
    const dragged = [rows[3], rows[0], rows[1], rows[2]];

    expect(toTagArrangement(dragged)).toEqual([
      { categoryId: GENERAL_CATEGORY_ID, tagIds: ["1"] },
      { categoryId: "work", tagIds: [] },
    ]);
  });
});

describe("moveTag()", () => {
  const arrangement = [
    { categoryId: GENERAL_CATEGORY_ID, tagIds: ["1", "2"] },
    { categoryId: "work", tagIds: ["3"] },
  ];

  test("swaps with the neighbor inside a category", () => {
    expect(moveTag(arrangement, "2", -1)?.[0].tagIds).toEqual(["2", "1"]);
  });

  test("crosses into the next and previous category at the edges", () => {
    expect(moveTag(arrangement, "2", 1)).toEqual([
      { categoryId: GENERAL_CATEGORY_ID, tagIds: ["1"] },
      { categoryId: "work", tagIds: ["2", "3"] },
    ]);
    expect(moveTag(arrangement, "3", -1)).toEqual([
      { categoryId: GENERAL_CATEGORY_ID, tagIds: ["1", "2", "3"] },
      { categoryId: "work", tagIds: [] },
    ]);
  });

  test("returns null at the very top and bottom", () => {
    expect(moveTag(arrangement, "1", -1)).toBeNull();
    expect(moveTag(arrangement, "3", 1)).toBeNull();
  });
});

describe("reorderCategories()", () => {
  test("orders by ids, missing categories follow", () => {
    expect(
      reorderCategories([general, work, fun], ["fun", "general"]).map(
        (category) => category.id
      )
    ).toEqual(["fun", "general", "work"]);
  });
});
