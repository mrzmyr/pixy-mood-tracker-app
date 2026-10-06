/**
 * Sort keys in every `assets/locales/*.json` file, so new keys land in
 * different places and parallel branches stop conflicting at the file end.
 *
 * - `bun scripts/sort-locales.ts`: rewrite unsorted files
 * - `bun scripts/sort-locales.ts --check`: exit 1 when a file is unsorted
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const LOCALES_DIR = path.join(import.meta.dir, "../assets/locales");

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const isPlainObject = (value: Json): value is { [key: string]: Json } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Return a copy with object keys in code point order at every depth.
 * Array order stays, because it carries meaning.
 */
export const sortKeysDeep = (value: Json): Json => {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const sorted: { [key: string]: Json } = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortKeysDeep(value[key]);
  }
  return sorted;
};

/** Check that object keys are in code point order at every depth. */
export const isSortedDeep = (value: Json): boolean => {
  if (Array.isArray(value)) {
    return value.every(isSortedDeep);
  }
  if (!isPlainObject(value)) {
    return true;
  }
  const keys = Object.keys(value);
  return (
    keys.every((key, index) => index === 0 || keys[index - 1] < key) &&
    keys.every((key) => isSortedDeep(value[key]))
  );
};

const run = () => {
  const isCheck = process.argv.includes("--check");
  const files = readdirSync(LOCALES_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort();
  const unsorted = files.filter((file) => {
    const filePath = path.join(LOCALES_DIR, file);
    const content: Json = JSON.parse(readFileSync(filePath, "utf-8"));
    if (isSortedDeep(content)) {
      return false;
    }
    if (!isCheck) {
      writeFileSync(
        filePath,
        `${JSON.stringify(sortKeysDeep(content), null, 2)}\n`
      );
    }
    return true;
  });

  if (!isCheck) {
    console.log(`Sorted ${unsorted.length} of ${files.length} locale files.`);
    return;
  }
  if (unsorted.length > 0) {
    console.error(
      [
        "error [locales_unsorted]: Locale keys are not sorted",
        `  why: ${unsorted.join(", ")} have keys out of code point order. Sorted keys keep parallel branches from conflicting at the file end.`,
        "  fix: Run `bun run i18n:sort`, then commit the result",
      ].join("\n")
    );
    process.exit(1);
  }
};

if (import.meta.main) {
  run();
}
