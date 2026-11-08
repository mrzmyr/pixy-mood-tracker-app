import type dayjs from "dayjs";
import type { LogItem } from "@/features/logs";
import { rankInfluences } from "./ranking";
import type { InfluenceOption } from "./ranking";

/** People in the avatar row before "All". */
export const PEOPLE_ROW_COUNT = 12;

/** Tags shown on the screen. */
export const TOP_TAG_COUNT = 20;

/** Lists of the quick check-in screen, top to bottom. */
export interface SheetSections {
  people: InfluenceOption[];
  tags: InfluenceOption[];
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
 * Lists for the quick check-in screen.
 *
 * - Best 12 people and best 20 tags by {@link rankInfluences}. Picked items
 *   further down stay in the list.
 * - Archived people and tags never show.
 */
export const getSheetSections = ({
  rating,
  items,
  people,
  tags,
  picked,
  now,
}: {
  rating: LogItem["rating"] | null;
  items: LogItem[];
  people: { id: string; name: string; isArchived?: boolean }[];
  tags: { id: string; title: string; isArchived?: boolean }[];
  /** Picked people and tags as `person:<id>` and `tag:<id>`. */
  picked: string[];
  now: dayjs.Dayjs;
}): SheetSections => {
  const ranked = rankInfluences({
    items,
    people,
    tags,
    rating: rating ?? "neutral",
    now,
  });
  const pickedKeys = new Set(picked);
  return {
    people: topWithPicked(ranked, "person", PEOPLE_ROW_COUNT, pickedKeys),
    tags: topWithPicked(ranked, "tag", TOP_TAG_COUNT, pickedKeys),
  };
};
