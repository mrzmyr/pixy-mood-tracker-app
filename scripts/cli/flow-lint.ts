// Static checks of Maestro flows: every referenced file exists and every
// `id` selector matches a testID in src/. A removed subflow or testID
// otherwise fails only on a device run.
import fs from "node:fs";
import path from "node:path";

import { YAML } from "bun";
import { z } from "zod";

// Flow IDs that no testID pattern in src/ can produce, each with the reason.
const ALLOWED_IDS = {
  "widget-guide-next":
    "getTestId in src/components/Demo.tsx joins testID `widget-guide` and `next` at runtime.",
} satisfies Record<string, string>;

const FILE_KEYS = new Set(["runFlow", "runScript"]);

/** One broken reference in a flow. Same fields as CliError. */
export interface FlowLintIssue {
  status: "flow_file_missing" | "flow_test_id_unknown";
  message: string;
  why: string;
  fix: string;
}

type YamlNode = z.infer<ReturnType<typeof z.json>>;

const yamlSchema = z.json();
const mapSchema = z.record(z.string(), yamlSchema);
// `runFlow: <file>` or `runFlow: { file: <file> }`. Inline `commands` have no file.
const fileRefSchema = z.union([
  z.string(),
  z.looseObject({ file: z.string() }).transform(({ file }) => file),
]);

const listFiles = (dir: string, isMatch: (name: string) => boolean) =>
  fs
    .readdirSync(dir, { recursive: true, encoding: "utf-8" })
    .filter((file) => isMatch(file))
    .toSorted()
    .map((file) => path.join(dir, file));

/** File paths and `id` selectors a flow references, in file order. */
interface FlowRefs {
  files: string[];
  ids: string[];
}

const collectRefs = (node: YamlNode, refs: FlowRefs) => {
  if (Array.isArray(node)) {
    for (const item of node) {
      collectRefs(item, refs);
    }
    return;
  }
  const map = mapSchema.safeParse(node);
  if (!map.success) {
    return;
  }
  for (const [key, value] of Object.entries(map.data)) {
    const file = fileRefSchema.safeParse(value);
    if (FILE_KEYS.has(key) && file.success) {
      refs.files.push(file.data);
    }
    const id = z.string().safeParse(value);
    if (key === "id" && id.success) {
      refs.ids.push(id.data);
    }
    // env values are variables, not selectors.
    if (key !== "env") {
      collectRefs(value, refs);
    }
  }
};

const escapeRegExp = (text: string) =>
  text.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);

/** Index after the `}` that closes the `{` at `start`. */
const skipBraces = (source: string, start: number) => {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "{") {
      depth += 1;
    } else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return index + 1;
      }
    }
  }
  return source.length;
};

// A pattern needs this many fixed characters, else `${testID}` and
// `${prefix}-${name}` would match every ID.
const MIN_FIXED_LENGTH = 3;

/** Regex of one string or template literal body; `${...}` matches any text. */
const toPattern = (body: string, isTemplate: boolean) => {
  if (!isTemplate) {
    return { fixed: body, source: escapeRegExp(body) };
  }
  let fixed = "";
  let source = "";
  let index = 0;
  while (index < body.length) {
    if (body.startsWith("${", index)) {
      const end = skipBraces(body, index + 1);
      source += ".+";
      index = end;
    } else {
      fixed += body[index];
      source += escapeRegExp(body[index]);
      index += 1;
    }
  }
  return { fixed, source };
};

const LITERAL =
  /"(?<double>[^"\n]*)"|'(?<single>[^'\n]*)'|`(?<template>(?:[^`\\]|\\.)*)`/gu;

/** String and template literals in the value expression starting at `start`. */
const readValueLiterals = (source: string, start: number) => {
  const first = source[start];
  let end = start;
  if (first === "{") {
    end = skipBraces(source, start);
  } else if (first === '"' || first === "'" || first === "`") {
    end = source.indexOf(first, start + 1) + 1;
  }
  return [...source.slice(start, end).matchAll(LITERAL)].map(({ groups }) =>
    groups?.template === undefined
      ? toPattern(groups?.double ?? groups?.single ?? "", false)
      : toPattern(groups.template, true)
  );
};

// `testID=`, `testID:`, `editTestID=`, and default values like `testID = "x"`.
const TEST_ID_KEY = /\b\w*[tT]est[Ii][Dd]\w*\s*[=:]\s*/gu;

/** Patterns of every testID value that src/ sets. */
export const collectTestIdPatterns = (srcDir: string) => {
  const patterns = new Set<string>();
  const files = listFiles(
    srcDir,
    (file) =>
      /\.tsx?$/u.test(file) &&
      !file.includes("__tests__") &&
      !/\.test\.tsx?$/u.test(file)
  );
  for (const file of files) {
    const source = fs.readFileSync(file, "utf-8");
    for (const match of source.matchAll(TEST_ID_KEY)) {
      for (const { fixed, source: pattern } of readValueLiterals(
        source,
        match.index + match[0].length
      )) {
        if (fixed.length >= MIN_FIXED_LENGTH) {
          patterns.add(pattern);
        }
      }
    }
  }
  return [...patterns].map((pattern) => new RegExp(`^${pattern}$`, "u"));
};

// Maestro variables like `${output.today}` stand for any text.
const toSampleId = (id: string) => id.replaceAll(/\$\{[^}]*\}/gu, "x");

/** Broken file references and unknown `id` selectors in e2e YAML files. */
export const lintFlows = (
  root: string,
  { e2eDir = "e2e", srcDir = "src" } = {}
): FlowLintIssue[] => {
  const patterns = collectTestIdPatterns(path.join(root, srcDir));
  const files = listFiles(path.join(root, e2eDir), (file) =>
    /\.ya?ml$/u.test(file)
  );
  return files.flatMap((file) => {
    const flow = path.relative(root, file);
    const refs: FlowRefs = { files: [], ids: [] };
    collectRefs(
      yamlSchema.parse(YAML.parse(fs.readFileSync(file, "utf-8"))),
      refs
    );
    const missingFiles = refs.files
      .filter((ref) => !fs.existsSync(path.resolve(path.dirname(file), ref)))
      .map((ref): FlowLintIssue => ({
        status: "flow_file_missing",
        message: `${flow} references missing file ${ref}`,
        why: `${path.relative(root, path.resolve(path.dirname(file), ref))} does not exist. Paths resolve from the folder of the referencing file.`,
        fix: "Point the step at an existing file, or restore the file.",
      }));
    const unknownIds = [...new Set(refs.ids)]
      .filter((id) => !Object.hasOwn(ALLOWED_IDS, id))
      .filter((id) => !patterns.some((pattern) => pattern.test(toSampleId(id))))
      .map((id): FlowLintIssue => ({
        status: "flow_test_id_unknown",
        message: `${flow} selects id "${id}", which no testID in ${srcDir}/ sets`,
        why: "The testID was renamed or removed, or the component builds it at runtime.",
        fix: `Use a testID that exists in ${srcDir}/. For an ID built at runtime, add it with a reason to ALLOWED_IDS in scripts/cli/flow-lint.ts.`,
      }));
    return [...missingFiles, ...unknownIds];
  });
};
