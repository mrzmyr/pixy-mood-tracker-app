import dayjs from "dayjs";
import { indexDays } from "../day-index";
import { peopleOn } from "../cards/summaries";
import { THRESHOLDS } from "../thresholds";
import type { RecapInput } from "../types";

/** One card of "Which ones are true?". `days` is shown, real or made up. */
export type QuizStatement =
  | { kind: "person"; personId: string; days: number; isTrue: boolean }
  | { kind: "tag"; tagId: string; days: number; isTrue: boolean };

/** Statements per Q6 module. `mix` takes from both. */
export type QuizModule = "people" | "tags" | "mix";

/**
 * Quiz slide. `truths`: 4 statements, one made up, tap all true ones.
 * `people` and `tags`: pick the most connected person or the most used tag.
 */
export type QuizSlide =
  | {
      type: "quiz";
      quiz: "truths";
      module: QuizModule;
      statements: QuizStatement[];
      /** Real value of the made-up statement. */
      actual: number;
    }
  | {
      type: "quiz";
      quiz: "people";
      personIds: string[];
      answer: string;
      runnerUp: { id: string; days: number };
      days: number;
    }
  | {
      type: "quiz";
      quiz: "tags";
      tagIds: string[];
      answer: string;
      runnerUp: { id: string; days: number };
      days: number;
    };

/** Stable pseudo-random number from a string, 0 to 1. */
const hash = (text: string) => {
  let value = 7;
  for (const char of text) {
    value = (value * 31 + (char.codePointAt(0) ?? 0)) % 1_000_003;
  }
  return value / 1_000_003;
};

/** `items` in a stable shuffled order for `seed`. */
const shuffle = <T>(items: T[], seed: string, key: (item: T) => string) =>
  [...items].sort((a, b) => hash(seed + key(a)) - hash(seed + key(b)));

/** Days per person, most first. Only people that still exist. */
const personDays = (input: RecapInput) => {
  if (!peopleOn(input)) {
    return [];
  }
  const at = indexDays(input.days);
  const counts = new Map<string, number>();
  for (const day of input.days) {
    for (const id of at(day).people) {
      if (input.personIds.has(id)) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .map(([id, days]) => ({ id, days }))
    .sort((a, b) => b.days - a.days);
};

/** Days per light tag, most first. */
const tagDays = (input: RecapInput, lightTags: ReadonlySet<string>) => {
  if (!input.steps.has("tags")) {
    return [];
  }
  const at = indexDays(input.days);
  const counts = new Map<string, number>();
  for (const day of input.days) {
    for (const id of at(day).tags) {
      if (lightTags.has(id)) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .map(([id, days]) => ({ id, days }))
    .sort((a, b) => b.days - a.days);
};

/**
 * A made-up count: clearly off, still possible. Doubles small counts,
 * halves big ones, never the real value or above the days of the month.
 */
export const madeUpDays = (actual: number, maxDays: number) => {
  if (actual * 2 + 3 <= maxDays) {
    return Math.max(actual + 3, actual * 2);
  }
  return Math.max(1, Math.floor(actual / 2));
};

const truths = (
  input: RecapInput,
  module: QuizModule,
  lightTags: ReadonlySet<string>
): QuizSlide | null => {
  const minDays = THRESHOLDS.quizMinDays;
  const people =
    module === "tags"
      ? []
      : personDays(input).filter((row) => row.days >= minDays);
  const tags =
    module === "people"
      ? []
      : tagDays(input, lightTags).filter((row) => row.days >= minDays);
  const pool: QuizStatement[] = [
    ...people.slice(0, 4).map((row): QuizStatement => ({
      kind: "person",
      personId: row.id,
      days: row.days,
      isTrue: true,
    })),
    ...tags.slice(0, 4).map((row): QuizStatement => ({
      kind: "tag",
      tagId: row.id,
      days: row.days,
      isTrue: true,
    })),
  ];
  const seed = input.period.start + module;
  // Mix: 2 people and 2 tags when there are enough, so it really mixes.
  const picked =
    module === "mix"
      ? [
          ...shuffle(
            pool.filter((item) => item.kind === "person"),
            seed,
            JSON.stringify
          ).slice(0, 2),
          ...shuffle(
            pool.filter((item) => item.kind === "tag"),
            seed,
            JSON.stringify
          ).slice(0, 2),
        ]
      : shuffle(pool, seed, JSON.stringify).slice(0, 4);
  if (
    picked.length < 4 ||
    (module === "mix" &&
      !(
        picked.some((item) => item.kind === "person") &&
        picked.some((item) => item.kind === "tag")
      ))
  ) {
    return null;
  }
  const falseIndex = Math.floor(hash(`${seed}false`) * 4);
  let actual = 0;
  const statements = shuffle(picked, `${seed}order`, JSON.stringify).map(
    (item, index): QuizStatement => {
      if (index !== falseIndex) {
        return item;
      }
      actual = item.days;
      return {
        ...item,
        days: madeUpDays(item.days, input.days.length),
        isTrue: false,
      };
    }
  );
  return { type: "quiz", quiz: "truths", module, statements, actual };
};

/** Most connected person among 3 or 4 tiles. Needs a clear winner. */
const peopleQuiz = (input: RecapInput): QuizSlide | null => {
  const rows = personDays(input).slice(0, 4);
  const [first, second] = rows;
  if (rows.length < 3 || !first || !second || first.days === second.days) {
    return null;
  }
  return {
    type: "quiz",
    quiz: "people",
    personIds: shuffle(rows, input.period.start, (row) => row.id).map(
      (row) => row.id
    ),
    answer: first.id,
    days: first.days,
    runnerUp: second,
  };
};

/** Most used light tag among 3 or 4 tiles. Needs a clear winner. */
const tagsQuiz = (
  input: RecapInput,
  lightTags: ReadonlySet<string>
): QuizSlide | null => {
  const rows = tagDays(input, lightTags).slice(0, 4);
  const [first, second] = rows;
  if (rows.length < 3 || !first || !second || first.days === second.days) {
    return null;
  }
  return {
    type: "quiz",
    quiz: "tags",
    tagIds: shuffle(rows, input.period.start, (row) => row.id).map(
      (row) => row.id
    ),
    answer: first.id,
    days: first.days,
    runnerUp: second,
  };
};

/** How many true statements a module could offer: its richness. */
const richness = (
  input: RecapInput,
  module: Exclude<QuizModule, "mix">,
  lightTags: ReadonlySet<string>
) =>
  module === "people"
    ? personDays(input).filter((row) => row.days >= THRESHOLDS.quizMinDays)
        .length
    : tagDays(input, lightTags).filter(
        (row) => row.days >= THRESHOLDS.quizMinDays
      ).length;

/**
 * One quiz per month, by month: truths, people, truths with the other
 * module, tags. Truths take the richest module first. Falls back to any
 * quiz the month has data for; `null` without one.
 */
export const buildQuiz = (
  input: RecapInput,
  lightTags: ReadonlySet<string>
): QuizSlide | null => {
  const modules = (["people", "tags"] as const)
    .map((module) => ({ module, rich: richness(input, module, lightTags) }))
    .sort((a, b) => b.rich - a.rich)
    .map(({ module }) => module);
  const [richest = "mix", other = "mix"] = modules;
  const turn = dayjs(input.period.start).month() % 4;
  const attempts: (() => QuizSlide | null)[] = [
    () => truths(input, "mix", lightTags) ?? truths(input, richest, lightTags),
    () => peopleQuiz(input),
    () =>
      truths(input, other, lightTags) ??
      truths(input, "mix", lightTags) ??
      truths(input, richest, lightTags),
    () => tagsQuiz(input, lightTags),
  ];
  for (let step = 0; step < attempts.length; step += 1) {
    const quiz = attempts[(turn + step) % attempts.length]?.();
    if (quiz) {
      return quiz;
    }
  }
  return null;
};
