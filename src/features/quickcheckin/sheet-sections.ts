import type dayjs from "dayjs";
import type { LogItem } from "@/features/logs";
import type { Emotion } from "@/types";
import { rankInfluences } from "./ranking";
import type { InfluenceOption } from "./ranking";

/** People in the avatar row before "All". */
export const PEOPLE_ROW_COUNT = 12;

/** Tags shown before search. */
export const TOP_TAG_COUNT = 20;

const matches = (text: string, query: string) =>
  text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());

const byLabel = (a: InfluenceOption, b: InfluenceOption) =>
  a.label.localeCompare(b.label) || a.id.localeCompare(b.id);

/** Lists of the quick check-in screen, top to bottom. */
export interface SheetSections {
  emotions: Emotion[];
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
 * - No query: no emotions (the screen shows the logger emotion grid), the
 *   best 12 people and the best 20 tags by {@link rankInfluences}. Picked
 *   items further down stay in the list.
 * - Query: every enabled emotion, person, and tag whose label matches,
 *   A to Z.
 * - Archived people and tags never show.
 */
export const getSheetSections = ({
  query,
  rating,
  items,
  people,
  tags,
  emotions,
  picked,
  now,
}: {
  query: string;
  rating: LogItem["rating"] | null;
  items: LogItem[];
  people: { id: string; name: string; isArchived?: boolean }[];
  tags: { id: string; title: string; isArchived?: boolean }[];
  emotions: Emotion[];
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
  const enabled = emotions.filter((emotion) => emotion.disabled !== true);

  if (query.trim() !== "") {
    const found = ranked
      .filter((option) => matches(option.label, query))
      .sort(byLabel);
    return {
      emotions: enabled
        .filter((emotion) => matches(emotion.label, query))
        .sort((a, b) => a.label.localeCompare(b.label)),
      people: found.filter((option) => option.kind === "person"),
      tags: found.filter((option) => option.kind === "tag"),
    };
  }

  const pickedKeys = new Set(picked);
  return {
    emotions: [],
    people: topWithPicked(ranked, "person", PEOPLE_ROW_COUNT, pickedKeys),
    tags: topWithPicked(ranked, "tag", TOP_TAG_COUNT, pickedKeys),
  };
};
