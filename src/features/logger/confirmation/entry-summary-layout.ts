import { t } from "@/lib/translation";

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
 * One row of photos: columns of photo indexes, stacked top to bottom in each
 * column.
 */
export interface PhotoRow {
  height: number;
  columns: number[][];
}

const BENTOS = {
  2: [{ height: 200, columns: [[0], [1]] }],
  3: [{ height: 240, columns: [[0], [1, 2]] }],
  4: [
    { height: 150, columns: [[0], [1]] },
    { height: 150, columns: [[2], [3]] },
  ],
  5: [
    { height: 190, columns: [[0]] },
    { height: 90, columns: [[1], [2], [3], [4]] },
  ],
} satisfies Record<2 | 3 | 4 | 5, PhotoRow[]>;

/**
 * Rows of the full-width photo bento for 2 or more photos. Above
 * {@link BENTO_PHOTOS_MAX} the last photo carries "+N".
 */
export const getPhotoBento = (count: number): PhotoRow[] => {
  if (count < 2) {
    return [];
  }
  // SAFETY: count is 2 or more and capped at BENTO_PHOTOS_MAX (5).
  return BENTOS[Math.min(count, BENTO_PHOTOS_MAX) as keyof typeof BENTOS];
};

/**
 * Size of the single photo tile. `band`: full width, nothing beside it. `half`:
 * one tile beside it. `tall`: sleep and people stacked beside it.
 */
export type PhotoTileSize = "band" | "half" | "tall";

const PHOTO_TILE_SIZES: PhotoTileSize[] = ["band", "half", "tall"];

/**
 * Size of the single photo tile from the tiles beside it: sleep and
 * people. `null` without exactly one photo: 2 or more get the bento.
 */
export const getPhotoTileSize = ({
  hasPhoto,
  hasSleep,
  hasPeople,
}: {
  hasPhoto: boolean;
  hasSleep: boolean;
  hasPeople: boolean;
}) =>
  hasPhoto ? PHOTO_TILE_SIZES[Number(hasSleep) + Number(hasPeople)] : null;

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
