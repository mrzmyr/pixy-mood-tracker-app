import dayjs from "dayjs";

import { getFixture, getFixtureData } from "@/dev/fixtures";
import { initializeDayjs } from "@/lib/translation";
import { EMOTIONS } from "@/features/logger";
import type { LogItem } from "@/features/logs";
import type { Tag } from "@/features/tags";
import type { IQuestion } from "@/features/questioner";

// The root layout extends dayjs in an effect, after the catalog first renders.
initializeDayjs();

const yearFixture = getFixture("year");
const yearData = yearFixture ? getFixtureData(yearFixture) : null;

/** 365 entries from the `year` fixture, the newest one today. */
// SAFETY: src/__tests__/dev-fixtures.ts validates fixture items against the export schema.
export const sampleItems = (yearData?.items ?? []) as LogItem[];

/** Tags from the `year` fixture. */
// SAFETY: same fixture validation as `sampleItems`.
export const sampleTags = (yearData?.tags ?? []) as Tag[];

/** Newest entry with a note, tags, and emotions, for entry previews. */
export const sampleItem: LogItem = {
  ...([...sampleItems]
    .reverse()
    .find(
      (item) =>
        item.message.length > 0 &&
        item.tags.length > 0 &&
        item.emotions.length > 0
    ) ??
    sampleItems.at(-1) ?? {
      id: "design-guide",
      date: dayjs().format("YYYY-MM-DD"),
      dateTime: dayjs().toISOString(),
      createdAt: dayjs().toISOString(),
      rating: "good",
      sleep: { quality: "good" },
      message: "",
      tags: [],
      emotions: [],
    }),
};

/** Basic emotions reduced to the good, neutral, and bad grid categories. */
export const sampleBasicEmotions = EMOTIONS.filter(
  (emotion) =>
    emotion.mode === "basic" &&
    !emotion.disabled &&
    ["good", "neutral", "bad"].includes(emotion.category)
).slice(0, 12);

/** Logger question with three answers, for the feedback slide. */
export const sampleQuestion: IQuestion = {
  id: "design-guide",
  appVersion: "0.0.0",
  type: "single",
  text: { en: "How do you like the new statistics?" },
  answers: [
    { id: "love", emoji: "😍", text: { en: "Love them" } },
    { id: "ok", emoji: "🙂", text: { en: "They are fine" } },
    { id: "meh", emoji: "😕", text: { en: "Not useful" } },
  ],
};

/** Items in the 30 days before today. */
export const lastMonthItems = sampleItems.filter((item) =>
  dayjs(item.date).isAfter(dayjs().subtract(30, "day"))
);
