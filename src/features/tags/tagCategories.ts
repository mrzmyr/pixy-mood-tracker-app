import type { Tag, TagCategory } from "./TagsProvider";

/**
 * Id of the built-in category. Every tag without a known category belongs
 * here, so it can be renamed but never deleted.
 */
export const GENERAL_CATEGORY_ID = "general";

/** Most categories a user can have, General included. */
export const MAX_TAG_CATEGORIES = 10;

/** Tags with their categories, as stored. */
export interface TagCategoryData {
  tags: Tag[];
  categories: TagCategory[];
}

/** Tags of one category, in display order. */
export interface TagCategorySection {
  category: TagCategory;
  tags: Tag[];
}

/** Tag ids per category in the order a list shows them. */
export interface TagArrangement {
  categoryId: TagCategory["id"];
  tagIds: Tag["id"][];
}

/**
 * Makes stored tag data consistent. Pure.
 *
 * Keeps General as a category (first, when it was missing) and moves tags
 * without a known category into it. Data from before tag categories has no
 * categories, so all its tags land in General.
 */
export const normalizeTagCategories = (
  tags: Tag[],
  categories: TagCategory[] | undefined,
  generalTitle: string
): TagCategoryData => {
  const known = (categories ?? []).filter(
    (category, index, all) =>
      all.findIndex((other) => other.id === category.id) === index
  );
  const withGeneral = known.some(
    (category) => category.id === GENERAL_CATEGORY_ID
  )
    ? known
    : [{ id: GENERAL_CATEGORY_ID, title: generalTitle }, ...known];
  const ids = new Set(withGeneral.map((category) => category.id));

  return {
    categories: withGeneral,
    tags: tags.map((tag) =>
      tag.categoryId && ids.has(tag.categoryId)
        ? tag
        : { ...tag, categoryId: GENERAL_CATEGORY_ID }
    ),
  };
};

/**
 * Splits `tags` into one section per category, in category order. Tags keep
 * their relative order. Empty categories get an empty section. Pure.
 */
export const groupTagsByCategory = (
  tags: Tag[],
  categories: TagCategory[]
): TagCategorySection[] =>
  categories.map((category) => ({
    category,
    tags: tags.filter(
      (tag) => (tag.categoryId ?? GENERAL_CATEGORY_ID) === category.id
    ),
  }));

/**
 * Applies a list arrangement: listed tags take the category and order of
 * `arrangement`. Lists hide some tags (archived ones), so tags missing from
 * `arrangement` keep their category and follow the listed ones. Unknown and
 * repeated ids are ignored. Pure.
 */
export const arrangeTags = (
  tags: Tag[],
  arrangement: TagArrangement[]
): Tag[] => {
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  const arranged: Tag[] = [];
  const seen = new Set<Tag["id"]>();

  for (const { categoryId, tagIds } of arrangement) {
    for (const id of tagIds) {
      const tag = tagsById.get(id);
      if (tag && !seen.has(id)) {
        seen.add(id);
        arranged.push(
          tag.categoryId === categoryId ? tag : { ...tag, categoryId }
        );
      }
    }
  }

  return [...arranged, ...tags.filter((tag) => !seen.has(tag.id))];
};

/**
 * Returns `categories` in the order of `orderedIds`. Categories missing from
 * `orderedIds` follow in their old order. Pure.
 */
export const reorderCategories = (
  categories: TagCategory[],
  orderedIds: TagCategory["id"][]
): TagCategory[] => {
  const rank = new Map(orderedIds.map((id, index) => [id, index]));
  return [...categories].sort(
    (a, b) =>
      (rank.get(a.id) ?? orderedIds.length) -
      (rank.get(b.id) ?? orderedIds.length)
  );
};

/** One row of the grouped, sortable tag list. */
export type TagCategoryRow =
  | { type: "category"; key: string; category: TagCategory; index: number }
  | {
      type: "tag";
      key: string;
      tag: Tag;
      isFirst: boolean;
      isLast: boolean;
    }
  | { type: "empty"; key: string; category: TagCategory };

/**
 * Flattens sections into list rows: a header per category, then its tags.
 * Empty categories get a drop target row. Pure.
 */
export const toTagCategoryRows = (
  sections: TagCategorySection[]
): TagCategoryRow[] =>
  sections.flatMap(({ category, tags }, index): TagCategoryRow[] => [
    { type: "category", key: `category:${category.id}`, category, index },
    ...(tags.length === 0
      ? [
          {
            type: "empty" as const,
            key: `empty:${category.id}`,
            category,
          },
        ]
      : tags.map((tag, tagIndex) => ({
          type: "tag" as const,
          key: tag.id,
          tag,
          isFirst: tagIndex === 0,
          isLast: tagIndex === tags.length - 1,
        }))),
  ]);

/**
 * Reads the arrangement from rows after a drag: each tag belongs to the
 * nearest category header above it. Tags above the first header join the
 * first category. Pure.
 */
export const toTagArrangement = (rows: TagCategoryRow[]): TagArrangement[] => {
  const arrangement: TagArrangement[] = [];
  const beforeFirstHeader: Tag["id"][] = [];

  for (const row of rows) {
    if (row.type === "category") {
      arrangement.push({ categoryId: row.category.id, tagIds: [] });
    } else if (row.type === "tag") {
      const current = arrangement.at(-1);
      if (current) {
        current.tagIds.push(row.tag.id);
      } else {
        beforeFirstHeader.push(row.tag.id);
      }
    }
  }

  if (arrangement[0]) {
    arrangement[0].tagIds.unshift(...beforeFirstHeader);
  }
  return arrangement;
};

/**
 * Moves one tag a step up or down, the accessibility alternative to
 * dragging. At a category edge the tag moves into the neighbor category.
 * Returns `null` when the tag is already first or last. Pure.
 */
export const moveTag = (
  arrangement: TagArrangement[],
  tagId: Tag["id"],
  offset: -1 | 1
): TagArrangement[] | null => {
  const next = arrangement.map((section) => ({
    ...section,
    tagIds: [...section.tagIds],
  }));
  const sectionIndex = next.findIndex((section) =>
    section.tagIds.includes(tagId)
  );
  if (sectionIndex === -1) {
    return null;
  }
  const { tagIds } = next[sectionIndex];
  const index = tagIds.indexOf(tagId);
  const target = index + offset;

  if (target >= 0 && target < tagIds.length) {
    [tagIds[index], tagIds[target]] = [tagIds[target], tagIds[index]];
    return next;
  }

  const neighbor = next[sectionIndex + offset];
  if (!neighbor) {
    return null;
  }
  tagIds.splice(index, 1);
  if (offset === -1) {
    neighbor.tagIds.push(tagId);
  } else {
    neighbor.tagIds.unshift(tagId);
  }
  return next;
};
