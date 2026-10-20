import dayjs from "dayjs";
import type { IQuestion } from "../questioner";
import { QUESTION_COOLDOWN_DAYS, pickQuestion } from "../pick-question";

const question = (
  id: string,
  overrides: Partial<IQuestion> = {}
): IQuestion => ({
  id,
  appVersion: ">= 1.60.0",
  type: "single",
  text: { en: `Question ${id}`, de: `Frage ${id}` },
  answers: [{ id: "1", emoji: "👍", text: { en: "Yes" } }],
  ...overrides,
});

const pick = (overrides: Partial<Parameters<typeof pickQuestion>[0]> = {}) =>
  pickQuestion({
    questions: [question("q1"), question("q2")],
    answeredIds: new Set(),
    answeredDates: [],
    appVersion: "2.0.0",
    language: "en",
    now: dayjs("2026-10-20T12:00").toDate(),
    ...overrides,
  });

describe("pickQuestion", () => {
  test("returns the first question in list order", () => {
    expect(pick()?.id).toBe("q1");
  });

  test("skips answered questions", () => {
    expect(
      pick({
        answeredIds: new Set(["q1"]),
        answeredDates: ["2026-10-01T09:00:00.000Z"],
      })?.id
    ).toBe("q2");
  });

  test("returns null when every question is answered", () => {
    expect(
      pick({
        answeredIds: new Set(["q1", "q2"]),
        answeredDates: ["2026-10-01T09:00:00.000Z"],
      })
    ).toBeNull();
  });

  test("skips questions outside the app version range", () => {
    expect(
      pick({
        questions: [question("q1", { appVersion: ">= 3.0.0" }), question("q2")],
      })?.id
    ).toBe("q2");
  });

  test("skips questions without text in the app language", () => {
    expect(
      pick({
        language: "de",
        questions: [
          question("q1", { text: { en: "English only" } }),
          question("q2"),
        ],
      })?.id
    ).toBe("q2");
  });

  test("shows nothing while the last answer is inside the cooldown", () => {
    const lastAnswer = dayjs("2026-10-20T08:00")
      .subtract(QUESTION_COOLDOWN_DAYS - 1, "day")
      .toISOString();

    expect(
      pick({ answeredIds: new Set(["q1"]), answeredDates: [lastAnswer] })
    ).toBeNull();
  });

  test("shows the next question once the cooldown passed", () => {
    const lastAnswer = dayjs("2026-10-20T23:00")
      .subtract(QUESTION_COOLDOWN_DAYS, "day")
      .toISOString();

    expect(
      pick({ answeredIds: new Set(["q1"]), answeredDates: [lastAnswer] })?.id
    ).toBe("q2");
  });

  test("uses the latest answer date, not the last stored one", () => {
    expect(
      pick({
        answeredIds: new Set(["q1", "q0"]),
        answeredDates: ["2026-10-19T09:00", "2026-01-01T09:00"],
      })
    ).toBeNull();
  });
});
