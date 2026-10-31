import type { LogItem } from "@/features/logs";
import type { LogPhoto } from "@/types";
import { addDays } from "../days";
import { buildMonthStory, buildWeekStory } from "../story/deck";
import type { StorySlide, StorySlideType } from "../story/types";
import { makeInput, makeTags } from "./utils";

const SEP = "2026-09-01";
const TODAY = "2026-10-02";
const tags = makeTags(4);
const [swim, walk, , work] = tags;

const photo = (id: string): LogPhoto => ({
  id: `00000000-0000-4000-8000-${id.padStart(12, "0")}`,
  fileName: `${id}.jpg`,
  width: 100,
  height: 100,
  createdAt: "2026-09-01T10:00:00.000Z",
  source: "library",
});

/** 30 September days, neutral, plus `extra` per day index. */
const month = (
  extra: (index: number, date: string) => Partial<LogItem> = () => ({})
) =>
  Array.from({ length: 30 }, (_, index) => {
    const date = addDays(SEP, index);
    return { date, rating: "good" as const, ...extra(index, date) };
  });

const story = (
  items: Partial<LogItem>[],
  input: Parameters<typeof makeInput>[0] = {}
) =>
  buildMonthStory(
    makeInput({ kind: "month", today: TODAY, date: SEP, items, tags, ...input })
  );

const slide = <T extends StorySlideType>(
  slides: StorySlide[] | null,
  type: T
) =>
  // SAFETY: `find` matched on `type`, so the slide is that member of the union.
  slides?.find((item) => item.type === type) as
    | Extract<StorySlide, { type: T }>
    | undefined;

describe("month story", () => {
  test("needs 10 check-in days", () => {
    expect(story(month().slice(0, 9))).toBeNull();
    expect(story(month().slice(0, 10))).not.toBeNull();
  });

  test("opens during the month and for the 3 months after", () => {
    expect(story(month(), { today: "2026-09-30" })).not.toBeNull();
    expect(story(month(), { today: "2026-12-31" })).not.toBeNull();
    expect(story(month(), { today: "2027-01-01" })).toBeNull();
    expect(story(month(), { today: "2026-08-31" })).toBeNull();
  });

  test("starts with the cover and never pads", () => {
    const slides = story(month());
    expect(slides?.map((item) => item.type)).toEqual([
      "cover",
      "coming-up",
      "share",
    ]);
  });
});

describe("cover", () => {
  test("counts check-in days", () => {
    expect(slide(story(month()), "cover")).toEqual({
      type: "cover",
      checkIns: 30,
      photos: [],
    });
  });

  test("shows the photos of bright days in their pixels", () => {
    const items = month((index) =>
      index < 9 ? { photos: [photo(`${index}`)] } : {}
    );
    expect(slide(story(items), "cover")?.photos).toHaveLength(9);
  });

  test("never uses photos of harder days", () => {
    const items = month((index) =>
      index < 7 ? { rating: "bad", photos: [photo(`${index}`)] } : {}
    );
    expect(slide(story(items), "cover")?.photos).toEqual([]);
  });
});

/** Swim on 10 bright days, work on 10 harder days, walk every day. */
const moodTags = () =>
  month((index) => {
    if (index < 10) {
      return {
        rating: "very_good",
        tags: [{ id: swim.id }, { id: walk.id }],
      };
    }
    if (index < 20) {
      return { rating: "bad", tags: [{ id: work.id }, { id: walk.id }] };
    }
    return { tags: [{ id: walk.id }] };
  });

describe("tags that felt lighter or heavier", () => {
  test("name tags whose days felt lighter", () => {
    const rows = slide(story(moodTags()), "positive-tags")?.rows;

    expect(rows?.map((row) => row.tagId)).toEqual([swim.id]);
    expect(rows?.[0]?.days).toBe(10);
  });

  test("name tags whose days felt heavier", () => {
    const rows = slide(story(moodTags()), "negative-tags")?.rows;

    expect(rows?.map((row) => row.tagId)).toEqual([work.id]);
    expect(rows?.[0]?.delta).toBeLessThan(0);
  });

  test("follow the cover: lighter first, then heavier", () => {
    const types = (story(moodTags()) ?? []).map((item) => item.type);

    expect(types.slice(0, 3)).toEqual([
      "cover",
      "positive-tags",
      "negative-tags",
    ]);
  });

  test("stay out when tags are off", () => {
    const slides = story(moodTags(), { steps: ["rating"] });

    expect(slide(slides, "positive-tags")).toBeUndefined();
    expect(slide(slides, "negative-tags")).toBeUndefined();
  });
});

describe("orbit", () => {
  test("needs 3 people with 2+ connected days, most days first", () => {
    const items = month((index) => ({
      people: [
        { id: "ada" },
        ...(index < 5 ? [{ id: "jen" }] : []),
        ...(index < 2 ? [{ id: "kim" }] : []),
        ...(index < 1 ? [{ id: "max" }] : []),
      ],
    }));
    expect(slide(story(items), "orbit")?.people).toEqual([
      { personId: "ada", days: 30 },
      { personId: "jen", days: 5 },
      { personId: "kim", days: 2 },
    ]);
    const fewer = month((index) => ({
      people: index < 1 ? [{ id: "ada" }, { id: "jen" }, { id: "kim" }] : [],
    }));
    expect(slide(story(fewer), "orbit")).toBeUndefined();
  });

  test("counts hard days too: a connection can feel any way", () => {
    const items = month(() => ({
      rating: "very_bad",
      people: [{ id: "ada" }, { id: "jen" }, { id: "kim" }],
    }));
    expect(slide(story(items), "orbit")?.people).toHaveLength(3);
  });

  test("stays out when people are off", () => {
    const items = month(() => ({
      people: [{ id: "ada" }, { id: "jen" }, { id: "kim" }],
    }));
    expect(
      slide(story(items, { steps: ["rating", "tags"] }), "orbit")
    ).toBeUndefined();
  });
});

describe("coming up", () => {
  test("counts days left and missed days since the first entry", () => {
    const items = month().slice(0, 20);
    expect(
      slide(story(items, { firstEntryDate: SEP }), "coming-up")
    ).toMatchObject({ year: 2026, left: 90, missed: 12 });
  });

  test("stays out once the year is over", () => {
    expect(
      slide(story(month(), { today: "2027-01-02" }), "coming-up")
    ).toBeUndefined();
  });
});

describe("share card", () => {
  test("shows 3 photos from 3 bright photo days", () => {
    const items = month((index) =>
      index < 3 ? { photos: [photo(`${index}`)] } : {}
    );
    expect(slide(story(items), "share")?.photos).toHaveLength(3);
  });

  test("shows photos from 1 or 2 bright photo days too", () => {
    const items = month((index) =>
      index < 2 ? { photos: [photo(`${index}`)] } : {}
    );
    expect(slide(story(items), "share")?.photos).toHaveLength(2);
  });

  test("shows only the grid without bright photo days", () => {
    expect(slide(story(month()), "share")?.photos).toEqual([]);
  });
});

describe("week story", () => {
  // Monday 2026-09-21 to Sunday 2026-09-27.
  const WEEK = "2026-09-21";
  const week = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      date: addDays(WEEK, index),
      rating: "good" as const,
    }));
  const weekStory = (items: Partial<LogItem>[], today = "2026-09-28") =>
    buildWeekStory(makeInput({ kind: "week", today, date: WEEK, items, tags }));

  test("needs 4 check-in days", () => {
    expect(weekStory(week(3))).toBeNull();
    expect(weekStory(week(4))).not.toBeNull();
  });

  test("opens during the week and for 2 weeks after", () => {
    expect(weekStory(week(7), "2026-09-25")).not.toBeNull();
    expect(weekStory(week(7), "2026-10-11")).not.toBeNull();
    expect(weekStory(week(7), "2026-10-12")).toBeNull();
  });

  test("starts with the intro and the cover, ends with the share card", () => {
    const types = (weekStory(week(7)) ?? []).map((item) => item.type);

    expect(types.slice(0, 2)).toEqual(["intro", "cover"]);
    expect(types.at(-1)).toBe("share");
  });
});
