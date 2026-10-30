import type { LogItem } from "@/features/logs";
import { t } from "@/lib/translation";

/** Whether the summary gets a hero: the entry has photos or a place. */
export const hasHero = (item: LogItem) =>
  item.photos.length > 0 || item.location !== undefined;

/** Photos in the bento before "+N". */
export const BENTO_PHOTOS_MAX = 5;
/** Faces before "+N". */
export const FACES_MAX = 3;

/** First `max` items and the count behind "+N". */
export const takeVisible = <T>(items: T[], max: number) => ({
  shown: items.slice(0, max),
  rest: Math.max(0, items.length - max),
});

/**
 * One row of the photo hero: `flex` share of the hero height, and columns of
 * photo indexes, stacked top to bottom in each column.
 */
export interface PhotoRow {
  flex: number;
  columns: number[][];
}

const BENTOS = {
  1: [{ flex: 1, columns: [[0]] }],
  2: [{ flex: 1, columns: [[0], [1]] }],
  3: [{ flex: 1, columns: [[0], [1, 2]] }],
  4: [
    { flex: 1, columns: [[0], [1]] },
    { flex: 1, columns: [[2], [3]] },
  ],
  5: [
    { flex: 2, columns: [[0]] },
    { flex: 1, columns: [[1], [2], [3], [4]] },
  ],
} satisfies Record<1 | 2 | 3 | 4 | 5, PhotoRow[]>;

/**
 * Rows of the photo hero. Above {@link BENTO_PHOTOS_MAX} the last photo
 * carries "+N". Empty without photos.
 */
export const getPhotoBento = (count: number): PhotoRow[] => {
  if (count < 1) {
    return [];
  }
  // SAFETY: count is 1 or more and capped at BENTO_PHOTOS_MAX (5).
  return BENTOS[Math.min(count, BENTO_PHOTOS_MAX) as keyof typeof BENTOS];
};

/** "Lena", "Lena and Sam", "Lena, Sam and Max", "Lena, Sam, Max and 2 more". */
export const joinNames = (names: string[]) => {
  const { shown, rest } = takeVisible(names, FACES_MAX);
  const items =
    rest > 0 ? [...shown, t("log_summary_more", { count: rest })] : shown;
  return items
    .map((name, index) => {
      if (index === 0) {
        return name;
      }
      // Translations carry their own spacing: Japanese and Chinese use none.
      const separator =
        index === items.length - 1
          ? t("log_summary_and")
          : t("log_summary_list_comma");
      return `${separator}${name}`;
    })
    .join("");
};
