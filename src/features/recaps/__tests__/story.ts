import type { LogItem } from "@/features/logs";
import type { LogPhoto } from "@/types";
import { addDays } from "../days";
import { buildMonthStory, buildWeekStory } from "../story/deck";
import type { StorySlide, StorySlideType } from "../story/types";
import { makeInput, makeTags } from "./utils";

const SEP = "2026-09-01";
const TODAY = "2026-10-02";
const tags = makeTags(4);
const [swim, walk, handover, work] = tags;

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
  test("shows a big count without photos", () => {
    expect(slide(story(month()), "cover")).toMatchObject({
      variant: "pixels",
      checkIns: 30,
    });
  });

  test("fills the screen with each photo for 1 to 6 photo days", () => {
    const items = month((index) =>
      index < 3 ? { photos: [photo(`${index}`)] } : {}
    );
    expect(slide(story(items), "cover")).toMatchObject({
      variant: "photo",
      photos: [
        { date: SEP },
        { date: addDays(SEP, 1) },
        { date: addDays(SEP, 2) },
      ],
    });
  });

  test("shows the brightest photos first", () => {
    const items = month((index) =>
      index < 3
        ? {
            rating: index === 2 ? "extremely_good" : "good",
            photos: [photo(`${index}`)],
          }
        : {}
    );
    expect(slide(story(items), "cover")?.photos[0]?.date).toBe(addDays(SEP, 2));
  });

  test("shows the photo grid from 7 photo days", () => {
    const items = month((index) =>
      index < 7 ? { photos: [photo(`${index}`)] } : {}
    );
    expect(slide(story(items), "cover")?.variant).toBe("photos");
  });

  test("never uses photos of harder days", () => {
    const items = month((index) =>
      index < 7 ? { rating: "bad", photos: [photo(`${index}`)] } : {}
    );
    expect(slide(story(items), "cover")).toMatchObject({
      variant: "pixels",
      photos: [],
    });
  });
});

const saturdays = (tagId: string) =>
  month((_, date) =>
    new Date(`${date}T12:00:00`).getDay() === 6 ? { tags: [{ id: tagId }] } : {}
  );

describe("same weekday", () => {
  test("finds a tag on every Saturday", () => {
    expect(slide(story(saturdays(swim.id)), "weekday-habit")).toMatchObject({
      tagId: swim.id,
      weekday: 6,
      hits: 4,
      total: 4,
    });
  });

  test("skips a tag that is on most days anyway", () => {
    const items = month(() => ({ tags: [{ id: walk.id }] }));
    expect(slide(story(items), "weekday-habit")).toBeUndefined();
  });

  test("never names a tag whose days feel heavier", () => {
    const items = month((_, date) =>
      new Date(`${date}T12:00:00`).getDay() === 6
        ? { rating: "very_bad", tags: [{ id: swim.id }] }
        : {}
    );
    expect(slide(story(items), "weekday-habit")).toBeUndefined();
  });
});

describe("harder days", () => {
  test("names a tag on 2 of 3 harder days and rare otherwise", () => {
    const items = month((index) => {
      if (index === 5 || index === 19) {
        return { rating: "bad", tags: [{ id: handover.id }] };
      }
      if (index === 20) {
        return { rating: "bad", tags: [{ id: work.id }] };
      }
      return index === 26 ? { tags: [{ id: handover.id }] } : {};
    });
    expect(slide(story(items), "hard-pattern")).toMatchObject({
      tagId: handover.id,
      tagHard: 2,
      tagOther: 1,
      otherDays: 27,
      hardDates: ["2026-09-06", "2026-09-20", "2026-09-21"],
    });
  });

  test("skips the slide without a tag pattern", () => {
    const items = month((index) => (index < 3 ? { rating: "bad" } : {}));
    expect(slide(story(items), "hard-pattern")).toBeUndefined();
  });
});

describe("made of", () => {
  test("needs 3 tags on 4+ days", () => {
    const two = month((index) => ({
      tags: index < 6 ? [{ id: swim.id }, { id: walk.id }] : [],
    }));
    expect(slide(story(two), "made-of")).toBeUndefined();
    const three = month((index) => ({
      tags:
        index < 6 ? [{ id: swim.id }, { id: walk.id }, { id: work.id }] : [],
    }));
    expect(slide(story(three), "made-of")?.tagIds).toHaveLength(3);
  });
});

describe("people", () => {
  test("needs 2 people with 3+ bright connected days", () => {
    const items = month((index) => ({
      rating: "very_good",
      people: index < 4 ? [{ id: "ada" }, { id: "jen" }] : [{ id: "ada" }],
    }));
    expect(slide(story(items), "people")?.people).toEqual([
      expect.objectContaining({ personId: "ada" }),
      expect.objectContaining({ personId: "jen" }),
    ]);
  });

  test("follows the people quiz right away, so guess and answer stay together", () => {
    // October opens with the people quiz (quiz turn by month).
    const OCT = "2026-10-01";
    // Swimming lifts the mood, so the deck also has a "lifted" slide that
    // used to sit between the quiz and the people slide.
    const items = Array.from({ length: 31 }, (_, index) => ({
      date: addDays(OCT, index),
      rating: index < 8 ? ("very_good" as const) : ("neutral" as const),
      tags: index < 8 ? [{ id: swim.id }] : [],
      people:
        index < 6
          ? [{ id: "ada" }, { id: "jen" }, { id: "kim" }]
          : [{ id: "ada" }],
    }));
    const types = (story(items, { date: OCT, today: "2026-11-02" }) ?? []).map(
      (item) => item.type
    );

    expect(types).toContain("lifted");
    expect(types.indexOf("people")).toBe(types.indexOf("quiz") + 1);
  });

  test("stays out when people are off", () => {
    const items = month(() => ({ people: [{ id: "ada" }, { id: "jen" }] }));
    expect(
      slide(story(items, { steps: ["rating", "tags"] }), "people")
    ).toBeUndefined();
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

describe("vs last month", () => {
  test("compares tag days with a month of 10+ check-ins", () => {
    const august = Array.from({ length: 12 }, (_, index) => ({
      date: addDays("2026-08-01", index),
      rating: "good" as const,
    }));
    const september = month((index) => ({
      tags: index < 5 ? [{ id: swim.id }] : [],
    }));
    expect(slide(story([...august, ...september]), "vs-last")?.rows).toEqual([
      { tagId: swim.id, days: 5, change: 5 },
    ]);
  });
});

describe("week by week", () => {
  test("shows each week as a collage of up to 4 bright photos", () => {
    const items = month((index) =>
      index < 6 || index === 8 || index === 15
        ? { photos: [photo(`${index}`)] }
        : {}
    );
    const weeks = slide(story(items), "moments")?.weeks;

    expect(weeks?.map((week) => week.photos.length)).toEqual([4, 1, 1, 0]);
  });

  test("needs photos in 3 weeks", () => {
    const items = month((index) =>
      index < 6 || index === 8 ? { photos: [photo(`${index}`)] } : {}
    );

    expect(slide(story(items), "moments")).toBeUndefined();
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

/** Check-in at a named place. */
const at = (name: string, latitude: number, longitude: number) => ({
  location: { latitude, longitude, name },
});

/** Week story of Sep 21 with location on. */
const PLACES_WEEK = "2026-09-21";
const placesStory = (items: Partial<LogItem>[]) =>
  buildWeekStory(
    makeInput({
      kind: "week",
      today: "2026-09-28",
      date: PLACES_WEEK,
      items,
      tags,
      locationEnabled: true,
    })
  );

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

  test("starts with the cover and ends with the share card", () => {
    const types = (weekStory(week(7)) ?? []).map((item) => item.type);

    expect(types[0]).toBe("cover");
    expect(types.at(-1)).toBe("share");
  });

  test("shows up to 5 photos one after another, never the grid", () => {
    const items = week(7).map((item, index) => ({
      ...item,
      photos: [photo(`${index}`)],
    }));
    const cover = slide(weekStory(items), "cover");

    expect(cover?.variant).toBe("photo");
    expect(cover?.photos).toHaveLength(5);
  });

  test("shows the orbit after the people slide", () => {
    const items = week(7).map((item, index) => ({
      ...item,
      rating: "very_good" as const,
      people:
        index < 3
          ? [{ id: "ada" }, { id: "jen" }, { id: "kim" }]
          : [{ id: "ada" }],
    }));
    const types = (weekStory(items) ?? []).map((item) => item.type);

    expect(types.indexOf("orbit")).toBe(types.indexOf("people") + 1);
  });
  describe("recap cards", () => {
    const eimsbuettel = at("Eimsbüttel, Hamburg", 53.57, 9.95);
    const ottensen = at("Ottensen, Hamburg", 53.55, 9.93);
    const copenhagen = at("Indre By, Copenhagen", 55.68, 12.57);
    test("open the story after the cover: best day, mood, emotions, places", () => {
      const items = week(7).map((item, index) => ({
        ...item,
        ...(index < 4 ? eimsbuettel : ottensen),
        rating: index === 5 ? ("extremely_good" as const) : item.rating,
        emotions: [["calm", "loved", "excited"][index % 3] ?? "calm"],
      }));
      const types = (placesStory(items) ?? []).map((item) => item.type);

      expect(types.slice(0, 5)).toEqual([
        "cover",
        "best-day",
        "week-mood",
        "top-emotions",
        "close-by",
      ]);
    });

    test("tell the extremely good day with its emotions and photo", () => {
      const items = week(7).map((item, index) =>
        index === 2
          ? {
              ...item,
              rating: "extremely_good" as const,
              emotions: ["excited", "loved", "calm", "grateful"],
              photos: [photo("best")],
            }
          : item
      );
      const best = slide(weekStory(items), "best-day");

      expect(best?.date).toBe(addDays(WEEK, 2));
      expect(best?.emotions).toEqual(["excited", "loved", "calm"]);
      expect(best?.photo?.photo.fileName).toBe("best.jpg");
    });

    test("skip the best day without an extremely good day", () => {
      expect(slide(weekStory(week(7)), "best-day")).toBeUndefined();
    });

    test("show home city districts close by, most days first", () => {
      const items = week(7).map((item, index) => ({
        ...item,
        ...(index < 5 ? eimsbuettel : ottensen),
      }));
      const close = slide(placesStory(items), "close-by");

      expect(close?.places.map((place) => [place.name, place.days])).toEqual([
        ["Eimsbüttel", 5],
        ["Ottensen", 2],
      ]);
    });

    test("never show a photo from a harder day on a place", () => {
      const items = week(7).map((item, index) => ({
        ...item,
        ...eimsbuettel,
        rating: index === 0 ? ("bad" as const) : item.rating,
        photos: index === 0 ? [photo("hard")] : [],
      }));
      const [place] = slide(placesStory(items), "close-by")?.places ?? [];

      expect(place?.photo).toBeNull();
    });

    test("show trips far out instead of the first city slide", () => {
      const history = Array.from({ length: 10 }, (_, index) => ({
        date: addDays(WEEK, -20 + index),
        rating: "good" as const,
        ...eimsbuettel,
      }));
      const items = [
        ...history,
        ...week(7).map((item, index) => ({
          ...item,
          ...(index >= 4 ? copenhagen : eimsbuettel),
        })),
      ];
      const slides = placesStory(items);
      const far = slide(slides, "far-out");

      expect(far?.trips.map((trip) => [trip.name, trip.days])).toEqual([
        ["Copenhagen", 3],
      ]);
      expect(slide(slides, "first-city")).toBeUndefined();
    });

    test("skip places with location off", () => {
      const items = week(7).map((item) => ({ ...item, ...eimsbuettel }));
      const types = (weekStory(items) ?? []).map((item) => item.type);

      expect(types).not.toContain("close-by");
      expect(types).not.toContain("far-out");
    });
  });
});
