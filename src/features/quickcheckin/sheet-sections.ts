import type dayjs from "dayjs";
import type { LogItem } from "@/features/logs";
import { rankInfluences } from "./ranking";
import type { InfluenceOption } from "./ranking";

/** People in the avatar row before "All". */
export const PEOPLE_ROW_COUNT = 12;

/** Lists of the quick check-in screen, top to bottom. */
export interface SheetSections {
  people: InfluenceOption[];
}

/** Top `count` options of `kind`, plus picked ones further down the ranking. */
const topWithPicked = (
  ranked: InfluenceOption[],
  kind: InfluenceOption["kind"],
  count: number,
  picked: ReadonlySet<string>
) => {
  const ofKind = ranked.filter((option) => option.kind === kind);
  return [
    ...ofKind.slice(0, count),
    ...ofKind
      .slice(count)
      .filter((option) => picked.has(`${option.kind}:${option.id}`)),
  ];
};

/**
 * Lists for the quick check-in screen. Tags show all, in stored order, as
 * in the logger.
 *
 * - Best 12 people by {@link rankInfluences}. Picked people further down
 *   stay in the list.
 * - Archived people never show.
 */
export const getSheetSections = ({
  rating,
  items,
  people,
  picked,
  now,
}: {
  rating: LogItem["rating"] | null;
  items: LogItem[];
  people: { id: string; name: string; isArchived?: boolean }[];
  /** Picked people as `person:<id>`. */
  picked: string[];
  now: dayjs.Dayjs;
}): SheetSections => {
  const ranked = rankInfluences({
    items,
    people,
    tags: [],
    rating: rating ?? "neutral",
    now,
  });
  const pickedKeys = new Set(picked);
  return {
    people: topWithPicked(ranked, "person", PEOPLE_ROW_COUNT, pickedKeys),
  };
};
