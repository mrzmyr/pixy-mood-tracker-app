import { z } from "zod";
/**
 * Locale parity check. Fails when a locale in `assets/locales` lacks a key
 * from `en.json`, has a key `en.json` does not have, or changes the
 * placeholders or plural forms of a string. No baseline: every locale must be
 * complete.
 *
 * Usage: `bun run check:locales`
 */
import fs from "node:fs";
import path from "node:path";

/** Keys one locale lacks (`missing`) or has beyond `en.json` (`extra`). */
export interface LocaleGaps {
  missing: string[];
  extra: string[];
}

/** Gaps per locale file name without `.json`, for example `de`. */
export type LocaleGapMap = Record<string, LocaleGaps>;

/** Structured check failure, see AGENTS.md Errors. */
export interface LocaleProblem {
  status:
    | "locale_key_missing"
    | "locale_key_extra"
    | "locale_placeholder_mismatch"
    | "locale_plural_forms_mismatch"
    | "locale_file_invalid"
    | "locale_ellipsis"
    | "locale_straight_quote";
  message: string;
  why: string;
  fix: string;
}

const LOCALES_DIR = path.join(import.meta.dir, "../assets/locales");
const SOURCE_LOCALE = "en";

/** Current gaps of every locale against the source locale keys. */
export const findGaps = (
  sourceKeys: string[],
  locales: Record<string, string[]>
): LocaleGapMap => {
  const source = new Set(sourceKeys);
  return Object.fromEntries(
    Object.entries(locales)
      .map(([locale, keys]) => {
        const own = new Set(keys);
        return [
          locale,
          {
            missing: sourceKeys.filter((key) => !own.has(key)),
            extra: keys.filter((key) => !source.has(key)),
          },
        ] as const;
      })
      .filter(([, gaps]) => gaps.missing.length > 0 || gaps.extra.length > 0)
  );
};

const preview = (keys: string[]) =>
  keys.length > 5
    ? `${keys.slice(0, 5).join(", ")} (+${keys.length - 5} more)`
    : keys.join(", ");

/** One problem per locale with missing or extra keys. Empty means pass. */
export const reportGaps = (gaps: LocaleGapMap): LocaleProblem[] =>
  Object.entries(gaps)
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([locale, { missing, extra }]) => [
      ...(missing.length > 0
        ? [
            {
              status: "locale_key_missing" as const,
              message: `${locale}.json lacks ${missing.length} key(s) from en.json`,
              why: `Missing: ${preview(missing)}`,
              fix: `Translate the keys into assets/locales/${locale}.json in this change (docs/i18n.md#add-strings)`,
            },
          ]
        : []),
      ...(extra.length > 0
        ? [
            {
              status: "locale_key_extra" as const,
              message: `${locale}.json has ${extra.length} key(s) not in en.json`,
              why: `Extra: ${preview(extra)}`,
              fix: `Delete the keys from assets/locales/${locale}.json, or add them to en.json`,
            },
          ]
        : []),
    ]);

/**
 * Locale strings with every value as form → text. A plain string becomes
 * `{ "": text }`, a plural object keeps its forms such as `one` and `other`.
 */
export const LocaleStrings = z.record(
  z.string(),
  z.union([
    z.string().transform((text) => ({ "": text })),
    z.record(z.string(), z.string()),
  ])
);

type Strings = z.infer<typeof LocaleStrings>;

const PLACEHOLDER = /\{\{\w+\}\}|%\{\w+\}/gu;

/** Placeholders of a string. Plural forms may add or drop `{{count}}`. */
const placeholders = (text: string, isPluralForm: boolean) =>
  [...new Set(text.matchAll(PLACEHOLDER).map(([name]) => name))]
    .filter((name) => !(isPluralForm && name === "{{count}}"))
    .sort()
    .join(", ");

/**
 * Strings whose placeholders or plural forms differ from `en.json`. A
 * translated `{{count}}` or a dropped `other` form breaks the UI at runtime.
 */
export const findTranslationProblems = (
  locale: string,
  source: Strings,
  target: Strings
): LocaleProblem[] =>
  Object.entries(source).flatMap(([key, english]) => {
    const translated = target[key];
    if (!translated) {
      return [];
    }
    const forms = Object.keys(english).sort();
    if (forms.join(",") !== Object.keys(translated).sort().join(",")) {
      return [
        {
          status: "locale_plural_forms_mismatch" as const,
          message: `${locale}.json \`${key}\` has other plural forms than en.json`,
          why: `en.json forms: ${forms.filter(Boolean).join(", ") || "none"}`,
          fix: `Use exactly the plural forms of en.json in assets/locales/${locale}.json`,
        },
      ];
    }
    const isPlural = !forms.includes("");
    return forms.flatMap((form) => {
      const expected = placeholders(english[form] ?? "", isPlural);
      return expected === placeholders(translated[form] ?? "", isPlural)
        ? []
        : [
            {
              status: "locale_placeholder_mismatch" as const,
              message: `${locale}.json \`${form ? `${key}.${form}` : key}\` changes the placeholders of en.json`,
              why: `en.json placeholders: ${expected || "none"}`,
              fix: `Keep every placeholder unchanged in assets/locales/${locale}.json`,
            },
          ];
    });
  });

/** English strings: plain values, or plural forms such as `{ one, other }`. */
const SourceStrings = z.record(
  z.string(),
  z.union([z.string(), z.record(z.string(), z.string())])
);

/** Every English string with its key path, plural forms included. */
const flattenStrings = (strings: z.infer<typeof SourceStrings>) =>
  Object.entries(strings).flatMap(([key, value]) =>
    Object.entries(
      z.string().safeParse(value).success ? { "": value } : value
    ).map(
      ([form, text]) => [form ? `${key}.${form}` : key, String(text)] as const
    )
  );

/** English typography: `…` not `...`, curly quotes not straight ones. */
export const findTypographyProblems = (
  strings: (readonly [string, string])[]
): LocaleProblem[] =>
  strings.flatMap(([key, value]) => [
    ...(value.includes("...")
      ? [
          {
            status: "locale_ellipsis",
            message: `en.json \`${key}\` uses "..."`,
            why: "Pixy copy uses the single ellipsis character",
            fix: "Replace ... with …",
          },
        ]
      : []),
    ...(/["']/u.test(value)
      ? [
          {
            status: "locale_straight_quote",
            message: `en.json \`${key}\` uses a straight quote`,
            why: "Pixy copy uses curly quotes and apostrophes",
            fix: "Use ’ for apostrophes and “ ” for quotes",
          },
        ]
      : []),
  ]);

const report = (problem: LocaleProblem) =>
  console.error(
    `error [${problem.status}]: ${problem.message}\n  why: ${problem.why}\n  fix: ${problem.fix}`
  );

const readStrings = (file: string): Strings => {
  try {
    return LocaleStrings.parse(JSON.parse(fs.readFileSync(file, "utf-8")));
  } catch (error) {
    report({
      status: "locale_file_invalid",
      message: `Cannot read ${path.relative(process.cwd(), file)}`,
      why: error instanceof Error ? error.message : String(error),
      fix: "Fix the JSON syntax in the file and run the check again",
    });
    process.exit(1);
  }
};

const main = () => {
  const files = fs
    .readdirSync(LOCALES_DIR)
    .filter((file) => file.endsWith(".json"));
  const source = readStrings(path.join(LOCALES_DIR, `${SOURCE_LOCALE}.json`));
  const locales: Record<string, Strings> = {};
  for (const file of files) {
    const locale = path.basename(file, ".json");
    if (locale !== SOURCE_LOCALE) {
      locales[locale] = readStrings(path.join(LOCALES_DIR, file));
    }
  }

  const problems = [
    ...reportGaps(
      findGaps(
        Object.keys(source),
        Object.fromEntries(
          Object.entries(locales).map(([locale, strings]) => [
            locale,
            Object.keys(strings),
          ])
        )
      )
    ),
    ...Object.entries(locales).flatMap(([locale, strings]) =>
      findTranslationProblems(locale, source, strings)
    ),
    ...findTypographyProblems(flattenStrings(source)),
  ];
  for (const problem of problems) {
    report(problem);
  }
  if (problems.length > 0) {
    process.exit(1);
  }
  console.log(`ok: ${files.length} locale files are complete`);
};

if (import.meta.main) {
  main();
}
