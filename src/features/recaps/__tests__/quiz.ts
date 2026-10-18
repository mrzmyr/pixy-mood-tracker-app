import type { LogItem } from "@/features/logs";
import { addDays } from "../days";
import { buildQuiz, madeUpDays } from "../story/quiz";
import { makeInput, makeTags } from "./utils";

const tags = makeTags(4);
const ALL_TAGS = new Set(tags.map((tag) => tag.id));

/** 30 days of `month`: 4 tags and 4 people on different numbers of days. */
const busyMonth = (month: string): Partial<LogItem>[] =>
  Array.from({ length: 30 }, (_, index) => ({
    date: addDays(`${month}-01`, index),
    rating: "good",
    tags: tags.filter((_tag, tagIndex) => index % (tagIndex + 1) === 0),
    people: ["ada", "jen", "kai", "mia"]
      .filter((_id, personIndex) => index % (personIndex + 2) === 0)
      .map((id) => ({ id })),
  }));

const quizFor = (
  month: string,
  items = busyMonth(month),
  lightTags = ALL_TAGS
) =>
  buildQuiz(
    makeInput({
      kind: "month",
      date: `${month}-01`,
      today: "2027-02-01",
      items,
      tags,
    }),
    lightTags
  );

describe("quiz rotation", () => {
  test("turns month by month: truths, people, truths, tags", () => {
    expect(
      ["2026-01", "2026-02", "2026-03", "2026-04"].map(
        (month) => quizFor(month)?.quiz
      )
    ).toEqual(["truths", "people", "truths", "tags"]);
  });

  test("falls back to the next quiz without people", () => {
    const items = busyMonth("2026-02").map((item) => ({ ...item, people: [] }));
    expect(quizFor("2026-02", items)?.quiz).toBe("truths");
  });

  test("no quiz without people and tags", () => {
    const items = busyMonth("2026-01").map((item) => ({
      ...item,
      people: [],
      tags: [],
    }));
    expect(quizFor("2026-01", items)).toBeNull();
  });
});

describe("which ones are true", () => {
  test("has 4 cards, exactly one made up with a wrong count", () => {
    const quiz = quizFor("2026-01");
    const statements = quiz?.quiz === "truths" ? quiz.statements : [];
    const madeUp = statements.filter((statement) => !statement.isTrue);
    expect(statements).toHaveLength(4);
    expect(madeUp).toHaveLength(1);
    expect(madeUp[0]?.days).not.toBe(quiz?.quiz === "truths" && quiz.actual);
  });

  test("mix takes both people and tags", () => {
    const quiz = quizFor("2026-01");
    expect(quiz).toMatchObject({ quiz: "truths", module: "mix" });
    if (quiz?.quiz === "truths") {
      expect(new Set(quiz.statements.map((item) => item.kind))).toEqual(
        new Set(["person", "tag"])
      );
    }
  });

  test("never names a tag outside the light tags", () => {
    const quiz = quizFor("2026-04", busyMonth("2026-04"), new Set());
    expect(quiz?.quiz).not.toBe("tags");
  });
});

describe("made-up count", () => {
  test("doubles small counts and halves big ones", () => {
    expect(madeUpDays(4, 30)).toBe(8);
    expect(madeUpDays(2, 30)).toBe(5);
    expect(madeUpDays(25, 30)).toBe(12);
  });
});
