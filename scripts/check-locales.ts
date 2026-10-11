/**
 * Locale key parity check. Fails when a locale in `assets/locales` lacks a key
 * from `en.json` or has a key `en.json` does not have.
 *
 * Known gaps live in `scripts/locale-gaps.json`. The baseline may only shrink:
 * `--prune` removes fixed gaps and never adds new ones.
 *
 * Usage: `bun run check:locales [--prune]`
 */
import fs from "node:fs";
import path from "node:path";

/** Keys one locale lacks (`missing`) or has beyond `en.json` (`extra`). */
export interface LocaleGaps {
  missing: string[];
  extra: string[];
}

/** Known gaps per locale file name without `.json`, for example `de`. */
export type GapBaseline = Record<string, LocaleGaps>;

/** Structured check failure, see AGENTS.md Errors. */
export interface LocaleProblem {
  status:
    | "locale_key_missing"
    | "locale_key_extra"
    | "locale_baseline_stale"
    | "locale_file_invalid";
  message: string;
  why: string;
  fix: string;
}

const LOCALES_DIR = path.join(import.meta.dir, "../assets/locales");
const BASELINE_PATH = path.join(import.meta.dir, "locale-gaps.json");
const SOURCE_LOCALE = "en";

const withGapsOnly = (
  entries: (readonly [string, LocaleGaps])[]
): GapBaseline =>
  Object.fromEntries(
    entries.filter(
      ([, gaps]) => gaps.missing.length > 0 || gaps.extra.length > 0
    )
  );

/** Current gaps of every locale against the source locale keys. */
export const findGaps = (
  sourceKeys: string[],
  locales: Record<string, string[]>
) => {
  const source = new Set(sourceKeys);
  return withGapsOnly(
    Object.entries(locales).map(([locale, keys]) => {
      const own = new Set(keys);
      return [
        locale,
        {
          missing: sourceKeys.filter((key) => !own.has(key)),
          extra: keys.filter((key) => !source.has(key)),
        },
      ] as const;
    })
  );
};

const difference = (left: string[] = [], right: string[] = []) => {
  const exclude = new Set(right);
  return left.filter((key) => !exclude.has(key));
};

const intersection = (left: string[] = [], right: string[] = []) => {
  const keep = new Set(right);
  return left.filter((key) => keep.has(key));
};

const preview = (keys: string[]) =>
  keys.length > 5
    ? `${keys.slice(0, 5).join(", ")} (+${keys.length - 5} more)`
    : keys.join(", ");

/** Compare current gaps with the baseline. Empty result means pass. */
export const compareGaps = (
  current: GapBaseline,
  baseline: GapBaseline
): LocaleProblem[] => {
  const problems: LocaleProblem[] = [];
  const locales = [
    ...new Set([...Object.keys(current), ...Object.keys(baseline)]),
  ].sort();
  for (const locale of locales) {
    const now = current[locale] ?? { missing: [], extra: [] };
    const known = baseline[locale] ?? { missing: [], extra: [] };
    const newMissing = difference(now.missing, known.missing);
    const newExtra = difference(now.extra, known.extra);
    const fixed = [
      ...difference(known.missing, now.missing),
      ...difference(known.extra, now.extra),
    ];
    if (newMissing.length > 0) {
      problems.push({
        status: "locale_key_missing",
        message: `${locale}.json lacks ${newMissing.length} key(s) from en.json`,
        why: `Missing: ${preview(newMissing)}`,
        fix: `Add translations to assets/locales/${locale}.json in this change (docs/i18n.md#add-strings)`,
      });
    }
    if (newExtra.length > 0) {
      problems.push({
        status: "locale_key_extra",
        message: `${locale}.json has ${newExtra.length} key(s) not in en.json`,
        why: `Extra: ${preview(newExtra)}`,
        fix: `Delete the keys from assets/locales/${locale}.json, or add them to en.json`,
      });
    }
    if (fixed.length > 0) {
      problems.push({
        status: "locale_baseline_stale",
        message: `scripts/locale-gaps.json lists ${fixed.length} fixed gap(s) for ${locale}`,
        why: `Fixed: ${preview(fixed)}`,
        fix: "Run `bun run check:locales --prune` and commit scripts/locale-gaps.json",
      });
    }
  }
  return problems;
};

/** Baseline without gaps that no longer exist. Never adds gaps. */
export const pruneBaseline = (current: GapBaseline, baseline: GapBaseline) =>
  withGapsOnly(
    Object.entries(baseline).map(
      ([locale, known]) =>
        [
          locale,
          {
            missing: intersection(known.missing, current[locale]?.missing),
            extra: intersection(known.extra, current[locale]?.extra),
          },
        ] as const
    )
  );

const report = (problem: LocaleProblem) =>
  console.error(
    `error [${problem.status}]: ${problem.message}\n  why: ${problem.why}\n  fix: ${problem.fix}`
  );

const readKeys = (file: string): string[] => {
  try {
    return Object.keys(JSON.parse(fs.readFileSync(file, "utf-8")));
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
  const locales: Record<string, string[]> = {};
  for (const file of files) {
    const locale = path.basename(file, ".json");
    if (locale !== SOURCE_LOCALE) {
      locales[locale] = readKeys(path.join(LOCALES_DIR, file));
    }
  }
  const current = findGaps(
    readKeys(path.join(LOCALES_DIR, `${SOURCE_LOCALE}.json`)),
    locales
  );
  const loaded = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf-8"));
  const isPrune = process.argv.includes("--prune");
  const baseline = isPrune ? pruneBaseline(current, loaded) : loaded;
  if (isPrune) {
    fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
    console.log("pruned scripts/locale-gaps.json");
  }

  const problems = compareGaps(current, baseline);
  for (const problem of problems) {
    report(problem);
  }
  if (problems.length > 0) {
    process.exit(1);
  }
  console.log(
    `ok: ${files.length} locale files match en.json or the known-gap baseline`
  );
};

if (import.meta.main) {
  main();
}
