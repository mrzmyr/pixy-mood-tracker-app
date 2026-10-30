import { t } from "@/lib/translation";
import type { DaySummary } from "./day-summary";

/** Emotion chips before "+N". */
export const EMOTION_CHIPS_MAX = 6;
/** Tag chips before "+N". */
export const TAG_CHIPS_MAX = 8;
/** Photos in the mosaic before "+N". */
export const PHOTOS_MAX = 4;
/** Faces before "+N". */
export const FACES_MAX = 3;

/** First `max` items and the count behind "+N". */
export const takeVisible = <T>(items: T[], max: number) => ({
  shown: items.slice(0, max),
  rest: Math.max(0, items.length - max),
});

/**
 * Size of the photo tile. `band`: full width, nothing beside it. `half`:
 * one tile beside it. `tall`: sleep and people stacked beside it.
 */
export type PhotoTileSize = "band" | "half" | "tall";

const PHOTO_TILE_SIZES: PhotoTileSize[] = ["band", "half", "tall"];

/**
 * Size of the photo tile from the tiles beside it: sleep and people. `null`
 * without photos.
 */
export const getPhotoTileSize = ({
  hasPhotos,
  hasSleep,
  hasPeople,
}: {
  hasPhotos: boolean;
  hasSleep: boolean;
  hasPeople: boolean;
}) =>
  hasPhotos ? PHOTO_TILE_SIZES[Number(hasSleep) + Number(hasPeople)] : null;

/**
 * Text next to the mood pixel. Hard days never repeat the rating back: they
 * thank instead.
 */
export const getMoodText = (summary: DaySummary) => {
  if (summary.tone !== "bad") {
    return { text: t(summary.rating), isRating: true };
  }
  return {
    text: t(
      summary.isFirstEntry
        ? "log_summary_hard_day_first"
        : "log_summary_hard_day"
    ),
    isRating: false,
  };
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
