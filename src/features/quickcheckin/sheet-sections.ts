import type dayjs from "dayjs";
import type { LogItem } from "@/features/logs";
import type { Emotion } from "@/types";
import { getRatingCategory, rankInfluences } from "./ranking";
import type { InfluenceOption } from "./ranking";

/** Best guesses above the A-Z lists. */
const SUGGESTED_COUNT = 3;

const matches = (text: string, query: string) =>
  text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());

const byLabel = (a: InfluenceOption, b: InfluenceOption) =>
  a.label.localeCompare(b.label) || a.id.localeCompare(b.id);

/** Lists of the quick check-in screen, top to bottom. */
export interface SheetSections {
  emotions: Emotion[];
  /** Best guesses. Empty while searching. */
  suggested: InfluenceOption[];
  people: InfluenceOption[];
  tags: InfluenceOption[];
}

/**
 * Lists for the quick check-in screen.
 *
 * - No query: basic emotions, the rating's category first. Suggested holds
 *   the top 3 people and tags; People and Tags list the rest A to Z.
 * - Query: every enabled emotion, person, and tag whose label matches,
 *   A to Z. No Suggested section, so each match shows once.
 * - Archived people and tags never show.
 */
export const getSheetSections = ({
  query,
  rating,
  items,
  people,
  tags,
  emotions,
  now,
}: {
  query: string;
  rating: LogItem["rating"] | null;
  items: LogItem[];
  people: { id: string; name: string; isArchived?: boolean }[];
  tags: { id: string; title: string; isArchived?: boolean }[];
  emotions: Emotion[];
  now: dayjs.Dayjs;
}): SheetSections => {
  const ranked = rankInfluences({
    items,
    people,
    tags,
    rating: rating ?? "neutral",
    now,
  });

  if (query.trim() !== "") {
    const found = ranked
      .filter((option) => matches(option.label, query))
      .sort(byLabel);
    return {
      emotions: emotions
        .filter(
          (emotion) =>
            emotion.disabled !== true && matches(emotion.label, query)
        )
        .sort((a, b) => a.label.localeCompare(b.label)),
      suggested: [],
      people: found.filter((option) => option.kind === "person"),
      tags: found.filter((option) => option.kind === "tag"),
    };
  }

  const category = rating === null ? null : getRatingCategory(rating);
  const basic = emotions.filter(
    (emotion) => emotion.mode === "basic" && emotion.disabled !== true
  );
  const suggested = ranked.slice(0, SUGGESTED_COUNT);
  const rest = ranked.slice(SUGGESTED_COUNT).sort(byLabel);
  return {
    emotions: [
      ...basic.filter((emotion) => emotion.category === category),
      ...basic.filter((emotion) => emotion.category !== category),
    ],
    suggested,
    people: rest.filter((option) => option.kind === "person"),
    tags: rest.filter((option) => option.kind === "tag"),
  };
};
