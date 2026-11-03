import { addDays, getDaySleep } from "../days";
import { THRESHOLDS } from "../thresholds";
import type { RecapDay, RecapInput } from "../types";
import type {
  RoughNight,
  RoughNightItem,
  RoughNightStep,
  SleepNight,
  SleepSlide,
  StorySlide,
} from "./types";

/** Sleep quality of a rough night: bad (1) or very bad (0). */
const ROUGH_MAX = 1;
/** Sleep quality of a good night: good (3) or very good (4). */
const GOOD_MIN = 3;

/** Evening steps a rough-night slide shows, in slide order. */
const EVENING_STEPS: RoughNightStep[] = [
  "photos",
  "tags",
  "people",
  "emotions",
  "message",
];

const unique = <T>(values: T[]) => [...new Set(values)];

/** Key of a tag or person in `SleepSlide.marked` and `suggestion`. */
export const itemKey = (item: Pick<RoughNightItem, "kind" | "id">) =>
  `${item.kind}:${item.id}`;

/** What the evening `day` holds, only for steps the user has on. */
const evening = (
  input: RecapInput,
  day: RecapDay | undefined
): Omit<RoughNight, "evening" | "quality"> => {
  const items = day?.items ?? [];
  const on = (step: Parameters<typeof input.steps.has>[0]) =>
    input.steps.has(step);
  return {
    tagIds: on("tags")
      ? unique(items.flatMap((item) => item.tags.map(({ id }) => id)))
      : [],
    personIds: on("people")
      ? unique(items.flatMap((item) => item.people.map(({ id }) => id))).filter(
          (id) => input.personIds.has(id)
        )
      : [],
    emotions: on("emotions")
      ? unique(items.flatMap((item) => item.emotions))
      : [],
    photos: on("photos") ? items.flatMap((item) => item.photos) : [],
    note: on("message")
      ? items
          .flatMap((item) => {
            const message = item.message.trim();
            return message ? [message] : [];
          })
          .join("\n\n")
      : "",
  };
};

const hasContent = (night: RoughNight) =>
  night.tagIds.length > 0 ||
  night.personIds.length > 0 ||
  night.emotions.length > 0 ||
  night.photos.length > 0 ||
  night.note.length > 0;

/**
 * Tags and people of the rough nights. An item stands out when its share of
 * rough nights is far above its share of all days in the month. Items on
 * most days never stand out: a daily tag repeats on every night anyway.
 */
const roughNightItems = (
  input: RecapInput,
  roughNights: RoughNight[]
): (RoughNightItem & { lift: number })[] => {
  const shareOfDays = (has: (day: RecapDay) => boolean) =>
    input.days.filter(has).length / Math.max(1, input.days.length);
  const of = (
    kind: RoughNightItem["kind"],
    ids: (night: RoughNight) => string[],
    onDay: (day: RecapDay, id: string) => boolean
  ) =>
    unique(roughNights.flatMap(ids)).map((id) => {
      const nights = roughNights.filter((night) =>
        new Set(ids(night)).has(id)
      ).length;
      const base = shareOfDays((day) => onDay(day, id));
      return {
        kind,
        id,
        nights,
        isEveryday: base >= THRESHOLDS.roughNightsEverydayShare,
        lift: nights / roughNights.length - base,
      };
    });
  return [
    ...of(
      "tag",
      (night) => night.tagIds,
      (day, id) => day.items.some((item) => item.tags.some((t) => t.id === id))
    ),
    ...of(
      "person",
      (night) => night.personIds,
      (day, id) =>
        day.items.some((item) => item.people.some((p) => p.id === id))
    ),
  ].sort(
    (a, b) =>
      Number(a.isEveryday) - Number(b.isEveryday) ||
      b.lift - a.lift ||
      b.nights - a.nights
  );
};

/**
 * Sleep calendar of the month, with the sleep step on and 7+ nights of
 * sleep. Rough nights look at the evening before: the day before the
 * morning the sleep is stored on. With fewer than 2 rough nights that
 * have something logged that evening, the slide asks nothing.
 */
export const sleep = (input: RecapInput): SleepSlide | null => {
  if (!input.steps.has("sleep")) {
    return null;
  }
  const nights: SleepNight[] = input.days.flatMap((day) => {
    const quality = getDaySleep(day);
    return quality === null ? [] : [{ date: day.date, quality }];
  });
  if (nights.length < THRESHOLDS.storySleepMinNights) {
    return null;
  }
  const byDate = new Map(input.history.map((day) => [day.date, day]));
  const rough = nights
    .flatMap((night): RoughNight[] => {
      if (night.quality > ROUGH_MAX) {
        return [];
      }
      const date = addDays(night.date, -1);
      const found = {
        evening: date,
        quality: night.quality,
        ...evening(input, byDate.get(date)),
      };
      return hasContent(found) ? [found] : [];
    })
    .sort((a, b) => a.quality - b.quality)
    .slice(0, THRESHOLDS.roughNightsMax)
    .sort((a, b) => a.evening.localeCompare(b.evening));
  const roughNights = rough.length >= THRESHOLDS.roughNightsMin ? rough : [];
  const items =
    roughNights.length > 0 ? roughNightItems(input, roughNights) : [];
  const standOut = items.filter(
    (item) =>
      !item.isEveryday &&
      item.nights >= 2 &&
      item.lift >= THRESHOLDS.roughNightsMarkMinLift
  );
  const [suggestion] = standOut;
  return {
    type: "sleep",
    nights,
    goodNights: nights.filter((night) => night.quality >= GOOD_MIN).length,
    roughNights,
    items: items.map(({ lift: _lift, ...item }) => item),
    marked: standOut
      .filter((item) => item.kind === "tag")
      .slice(0, THRESHOLDS.roughNightsMarked)
      .map(itemKey),
    suggestion: suggestion ? itemKey(suggestion) : null,
    steps: EVENING_STEPS.filter((step) => input.steps.has(step)),
  };
};

/** Rough nights of the month after Yes: rough nights, overview, ask, end. */
export const buildRoughNightSlides = (slide: SleepSlide): StorySlide[] => [
  ...slide.roughNights.map((night, index) => ({
    type: "rough-night" as const,
    position: index + 1,
    count: slide.roughNights.length,
    night,
    sleep: slide,
  })),
  { type: "rough-nights-all", sleep: slide },
  ...(slide.items.length > 0
    ? [{ type: "rough-nights-ask" as const, sleep: slide }]
    : []),
  { type: "rough-nights-closing" },
];

/**
 * How often the user saw `key` on rough nights before `position` (1-based):
 * 0 on the first night it shows up.
 */
export const seenBefore = (slide: SleepSlide, key: string, position: number) =>
  slide.roughNights
    .slice(0, position - 1)
    .filter((night) =>
      key.startsWith("tag:")
        ? night.tagIds.includes(key.slice(4))
        : night.personIds.includes(key.slice(7))
    ).length;

/** The user's answer on the question slide, kept by the story screen. */
export interface RoughNightsAnswer {
  /** Item keys (`tag:<id>`, `person:<id>`). */
  picks: ReadonlySet<string>;
  isNotSure: boolean;
  /** Tags added with "I missed a tag". */
  added: { tagId: string; isNew: boolean; evenings: number }[];
}

/** No pick yet. Shared, never mutated: updates copy it. */
export const EMPTY_ANSWER: RoughNightsAnswer = {
  picks: new Set(),
  isNotSure: false,
  added: [],
};
