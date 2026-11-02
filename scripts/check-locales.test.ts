import { describe, expect, test } from "bun:test";
import {
  LocaleStrings,
  findGaps,
  findTranslationProblems,
  reportGaps,
} from "./check-locales";

const source = ["cancel", "clear", "done"];

describe("locale parity check", () => {
  test("passes when every locale has every key", () => {
    expect(reportGaps(findGaps(source, { de: source, fr: source }))).toEqual(
      []
    );
  });

  test("fails when a key misses in a locale", () => {
    const problems = reportGaps(
      findGaps(source, { de: ["cancel", "clear"], fr: source })
    );

    expect(problems.map(({ status, why }) => [status, why])).toEqual([
      ["locale_key_missing", "Missing: done"],
    ]);
  });

  test("fails when a locale keeps a key removed from en.json", () => {
    const problems = reportGaps(findGaps(source, { fr: [...source, "reset"] }));

    expect(problems.map(({ status }) => status)).toEqual(["locale_key_extra"]);
  });
});

describe("locale placeholder check", () => {
  const english = LocaleStrings.parse({
    greeting: "Hi {{name}}",
    since: "Since %{date}",
    days: { one: "1 day", other: "{{count}} days" },
  });

  const check = (german: Parameters<typeof LocaleStrings.parse>[0]) =>
    findTranslationProblems("de", english, LocaleStrings.parse(german));

  test("passes when placeholders and plural forms match", () => {
    expect(
      check({
        greeting: "Hallo {{name}}",
        since: "Seit %{date}",
        days: { one: "1 Tag", other: "{{count}} Tage" },
      })
    ).toEqual([]);
  });

  test("fails when a placeholder is translated or dropped", () => {
    const problems = check({
      greeting: "Hallo {{Name}}",
      since: "Seit",
      days: { one: "{{count}} Tag", other: "Tage" },
    });

    expect(problems.map(({ status, message }) => [status, message])).toEqual([
      [
        "locale_placeholder_mismatch",
        "de.json `greeting` changes the placeholders of en.json",
      ],
      [
        "locale_placeholder_mismatch",
        "de.json `since` changes the placeholders of en.json",
      ],
    ]);
  });

  test("fails when plural forms differ", () => {
    expect(
      check({ days: "{{count}} Tage" }).map(({ status }) => status)
    ).toEqual(["locale_plural_forms_mismatch"]);
  });
});
