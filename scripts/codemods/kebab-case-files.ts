/**
 * Codemod: rename files and folders under `src/` to kebab-case, then rewrite
 * every reference to them. Deterministic and idempotent: a second run finds
 * nothing to do. Rerun it on a fresh branch instead of resolving rename
 * conflicts by hand.
 *
 * - `bun scripts/codemods/kebab-case-files.ts`: rename and rewrite
 * - `bun scripts/codemods/kebab-case-files.ts --dry-run`: print the plan only
 *
 * What it rewrites, in every tracked text file:
 * - Module specifiers in string literals: `./x`, `../x`, `@/x`. This covers
 *   `import`, `export from`, `import()`, `require`, `jest.mock`, and
 *   `jest.requireActual`. Specifiers without extension, folder `index` files,
 *   and platform files (`.ios.tsx`, `.android.tsx`, `.web.tsx`,
 *   `.native.tsx`) keep their form.
 * - Repo paths that start with `src/`, also behind `./` or `../` (Markdown
 *   links, comments, lint globs). Only paths that exist and get renamed change.
 *
 * Renames use `git mv` through a temporary name, so case-only renames such as
 * `Calendar` to `calendar` work on case-insensitive file systems (macOS).
 * Rewritten code files go through `oxfmt`, because new specifiers change
 * import order and line length.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/** Folder that holds every file this codemod renames. */
export const SOURCE_ROOT = "src/";

/**
 * Paths the codemod never renames. Each entry is a path prefix.
 * - `src/app/`: Expo Router routes. File name is the URL segment, so a rename
 *   changes deep links. Route files already use kebab-case.
 * - `src/__mocks__/`: Jest mocks must mirror package names, for example
 *   `@react-native-async-storage/async-storage.js`.
 *
 * Everything outside `src/` stays too: tool config files (`jest.setup.js`,
 * `babel.config.js`, `app.config.ts`, `oxlint.config.ts`), `scripts/`,
 * `tools/`, `e2e/`, `assets/`, `docs/`, and root Markdown files. These
 * already use kebab-case, or a tool or convention dictates their name.
 */
export const EXCLUDED_PREFIXES = ["src/app/", "src/__mocks__/"];

/**
 * Tracked files whose content the codemod never rewrites: lock files,
 * generated assets, release history, and this codemod.
 */
export const CONTENT_EXCLUDED_PREFIXES = [
  "bun.lock",
  "CHANGELOG.md",
  "assets/",
  "scripts/codemods/kebab-case-files",
];

/** Exact text replacements for references the path rewrite cannot see. */
export const LITERAL_REPLACEMENTS: readonly [string, string][] = [
  // Lint glob for startup providers in oxlint.config.ts.
  ["src/features/**/*Provider.tsx", "src/features/**/*-provider.tsx"],
];

const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs"]);
const TEXT_EXTENSIONS = new Set([
  ...CODE_EXTENSIONS,
  ".json",
  ".md",
  ".mdx",
  ".yaml",
  ".yml",
  ".html",
]);

/** Structured codemod failure, see AGENTS.md Errors. */
export interface CodemodProblem {
  status: "kebab_case_collision" | "kebab_case_git_failed";
  message: string;
  why: string;
  fix: string;
}

const fail = (problem: CodemodProblem): never => {
  console.error(
    `error [${problem.status}]: ${problem.message}\n  why: ${problem.why}\n  fix: ${problem.fix}`
  );
  process.exit(1);
};

/**
 * Convert one name part to kebab-case: `MenuListItem` to `menu-list-item`,
 * `useURL` to `use-url`, `XAxis` to `x-axis`, `a11yLabels` to `a11y-labels`.
 */
export const toKebabCase = (name: string): string =>
  name
    .replaceAll(/(?<before>[a-z0-9])(?<after>[A-Z])/gu, "$<before>-$<after>")
    .replaceAll(/(?<before>[A-Z]+)(?<after>[A-Z][a-z])/gu, "$<before>-$<after>")
    .replaceAll("_", "-")
    .toLowerCase();

/**
 * Check for names that tools own: `__tests__`, `__mocks__`, `_layout`,
 * `+not-found`, `[id]`, and `(group)`.
 */
export const isReservedSegment = (segment: string): boolean =>
  /^[_+[(]/u.test(segment);

/**
 * Kebab-case one path segment. Only the part before the first dot changes,
 * so `Clock.ios.tsx` becomes `clock.ios.tsx` and `useScale.test.ts` becomes
 * `use-scale.test.ts`.
 */
export const toKebabSegment = (segment: string): string => {
  if (isReservedSegment(segment)) {
    return segment;
  }
  const dot = segment.indexOf(".");
  if (dot <= 0) {
    return toKebabCase(segment);
  }
  return toKebabCase(segment.slice(0, dot)) + segment.slice(dot);
};

/** Check that the codemod may rename this repo path. */
export const isRenamable = (repoPath: string): boolean =>
  repoPath.startsWith(SOURCE_ROOT) &&
  !EXCLUDED_PREFIXES.some((prefix) => repoPath.startsWith(prefix));

/** Target path for a repo path. Paths the codemod skips come back unchanged. */
export const toKebabPath = (repoPath: string): string => {
  if (!isRenamable(repoPath)) {
    return repoPath;
  }
  const [root, ...rest] = repoPath.split("/");
  return [root, ...rest.map(toKebabSegment)].join("/");
};

/**
 * Old path to new path for every renamed file, every renamed folder, and
 * every file path without its extensions (`src/x/Clock` for `Clock.ios.tsx`),
 * because imports omit extensions.
 */
export type RenameMap = Map<string, string>;

/** Build the rename map from the list of tracked files. */
export const buildRenameMap = (files: readonly string[]): RenameMap => {
  const map: RenameMap = new Map();
  const add = (from: string) => {
    const to = toKebabPath(from);
    if (to !== from) {
      map.set(from, to);
    }
  };
  for (const file of files) {
    if (!isRenamable(file)) {
      continue;
    }
    add(file);
    const base = path.posix.basename(file);
    const dot = base.indexOf(".");
    if (dot > 0) {
      add(file.slice(0, file.length - base.length + dot));
    }
    let dir = path.posix.dirname(file);
    while (dir.startsWith(SOURCE_ROOT)) {
      add(dir);
      dir = path.posix.dirname(dir);
    }
  }
  return map;
};

const isNameChar = (char: string) => /[\w-]/u.test(char);

/**
 * Map a repo path that may carry a suffix (extension, trailing punctuation,
 * deeper segments). Uses the longest map key that ends at a name boundary.
 * Returns `undefined` when nothing in the path gets renamed.
 */
export const mapRepoPath = (
  value: string,
  map: RenameMap
): string | undefined => {
  for (let end = value.length; end > 0; end -= 1) {
    if (end < value.length && isNameChar(value[end])) {
      continue;
    }
    const target = map.get(value.slice(0, end));
    if (target !== undefined) {
      return target + value.slice(end);
    }
  }
  return undefined;
};

const MODULE_SPECIFIER =
  /(?<quote>["'`])(?<spec>(?:\.{1,2}|@)\/[^"'`\n$]*)\k<quote>/gu;

/**
 * Rewrite module specifiers in one code file. `importer` and `newImporter`
 * are repo paths of the file before and after the rename.
 */
export const rewriteSpecifiers = (
  content: string,
  importer: string,
  newImporter: string,
  map: RenameMap
): string =>
  content.replaceAll(MODULE_SPECIFIER, (match, quote: string, spec: string) => {
    const isAlias = spec.startsWith("@/");
    const target = isAlias
      ? `${SOURCE_ROOT}${spec.slice(2)}`
      : path.posix.join(path.posix.dirname(importer), spec);
    const mapped = mapRepoPath(target, map) ?? target;
    if (isAlias) {
      return mapped === target
        ? match
        : `${quote}@/${mapped.slice(SOURCE_ROOT.length)}${quote}`;
    }
    if (mapped === target && importer === newImporter) {
      return match;
    }
    let next = path.posix.relative(path.posix.dirname(newImporter), mapped);
    if (!next.startsWith(".")) {
      next = `./${next}`;
    }
    if (spec.endsWith("/") && !next.endsWith("/")) {
      next += "/";
    }
    return next === spec ? match : `${quote}${next}${quote}`;
  });

const REPO_PATH =
  /(?<![\w@./-])(?<prefix>(?:\.{1,2}\/)*)(?<repoPath>src\/[\w@()[\]+.*/-]+)/gu;

/** Rewrite repo paths such as `src/hooks/useScale.ts` in any text file. */
export const rewriteRepoPaths = (content: string, map: RenameMap): string =>
  content.replaceAll(REPO_PATH, (match, prefix: string, repoPath: string) => {
    const mapped = mapRepoPath(repoPath, map);
    return mapped === undefined ? match : prefix + mapped;
  });

const LINK_WITH_FILE_LABEL =
  /\[`(?<label>[^`\]]+)`\]\((?<prefix>(?:\.{1,2}\/)*)(?<href>src\/[^)\s#]+)/gu;

/**
 * Rename Markdown link labels that show the file name of their target:
 * `` [`PlaceMap.tsx`](src/x/PlaceMap.tsx) `` gets the new file name too.
 */
export const rewriteLinkLabels = (content: string, map: RenameMap): string =>
  content.replaceAll(
    LINK_WITH_FILE_LABEL,
    (match, label: string, prefix: string, href: string) => {
      const mapped = mapRepoPath(href, map);
      if (mapped === undefined || label !== path.posix.basename(href)) {
        return match;
      }
      return `[\`${path.posix.basename(mapped)}\`](${prefix}${href}`;
    }
  );

/** Apply every rewrite to the content of one file. */
export const rewriteContent = (
  content: string,
  file: string,
  map: RenameMap
): string => {
  let next = content;
  if (CODE_EXTENSIONS.has(path.posix.extname(file))) {
    next = rewriteSpecifiers(next, file, toKebabPath(file), map);
  }
  if (file.endsWith(".md")) {
    next = rewriteLinkLabels(next, map);
  }
  next = rewriteRepoPaths(next, map);
  for (const [from, to] of LITERAL_REPLACEMENTS) {
    next = next.replaceAll(from, to);
  }
  return next;
};

/**
 * Find renames that land on the same path. macOS compares paths without
 * case, so `Foo.tsx` and `foo.tsx` in one folder collide too.
 */
export const findCollisions = (files: readonly string[]): string[][] => {
  const byTarget = new Map<string, string[]>();
  for (const file of files) {
    const key = toKebabPath(file).toLowerCase();
    byTarget.set(key, [...(byTarget.get(key) ?? []), file]);
  }
  return [...byTarget.values()].filter((group) => group.length > 1);
};

const git = (root: string, args: string[]) => {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf-8" });
  } catch (error) {
    return fail({
      status: "kebab_case_git_failed",
      message: `git ${args.join(" ")} failed`,
      why: error instanceof Error ? error.message : String(error),
      fix: "Fix the git state (conflicts, locked index). Rename leftover `*.kebab-case-tmp` paths back, then run the codemod again. It continues where it stopped.",
    });
  }
};

/** `git mv` through a temporary name, so case-only renames work on macOS. */
const move = (root: string, from: string, to: string) => {
  const temporary = `${from}.kebab-case-tmp`;
  git(root, ["mv", from, temporary]);
  git(root, ["mv", temporary, to]);
};

/** Run the repo formatter on rewritten code files. */
const formatFiles = (root: string, files: string[]) => {
  try {
    execFileSync(path.join(root, "node_modules/.bin/oxfmt"), files, {
      cwd: root,
      stdio: "ignore",
    });
  } catch (error) {
    console.warn(
      [
        "warn [kebab_case_format_failed]: oxfmt did not format the rewritten files",
        `  why: ${error instanceof Error ? error.message : String(error)}`,
        "  fix: Run `bun install`, then `bun run format`",
      ].join("\n")
    );
  }
};

const depth = (repoPath: string) => repoPath.split("/").length;

const run = () => {
  const isDryRun = process.argv.includes("--dry-run");
  const root = git(process.cwd(), ["rev-parse", "--show-toplevel"]).trim();
  const files = git(root, ["ls-files", "-z"])
    .split("\0")
    .filter((file) => file !== "" && existsSync(path.join(root, file)));

  const collisions = findCollisions(files);
  if (collisions.length > 0) {
    fail({
      status: "kebab_case_collision",
      message: `${collisions.length} renames land on the same path`,
      why: collisions.map((group) => group.join(" + ")).join("; "),
      fix: "Rename or merge one file of each group by hand, then run the codemod again",
    });
  }

  const map = buildRenameMap(files);
  const renamedFiles = files.filter((file) => toKebabPath(file) !== file);

  const rewritten: string[] = [];
  for (const file of files) {
    if (
      !TEXT_EXTENSIONS.has(path.posix.extname(file)) ||
      CONTENT_EXCLUDED_PREFIXES.some((prefix) => file.startsWith(prefix))
    ) {
      continue;
    }
    const absolute = path.join(root, file);
    const content = readFileSync(absolute, "utf-8");
    const next = rewriteContent(content, file, map);
    if (next !== content) {
      rewritten.push(toKebabPath(file));
      if (isDryRun) {
        console.log(`rewrite ${file}`);
      } else {
        writeFileSync(absolute, next);
      }
    }
  }

  // Folders first, parents before children, so each `git mv` sees the
  // current parent path. A folder move carries its untracked files along.
  const folders = [
    ...new Set(renamedFiles.map((file) => path.posix.dirname(file))),
  ]
    .flatMap((dir) => {
      const parents: string[] = [];
      for (
        let next = dir;
        next.startsWith(SOURCE_ROOT);
        next = path.posix.dirname(next)
      ) {
        parents.push(next);
      }
      return parents;
    })
    .filter(
      (dir, index, all) =>
        all.indexOf(dir) === index &&
        toKebabSegment(path.posix.basename(dir)) !== path.posix.basename(dir)
    )
    .sort((a, b) => depth(a) - depth(b) || a.localeCompare(b));

  for (const dir of folders) {
    const from = `${toKebabPath(path.posix.dirname(dir))}/${path.posix.basename(dir)}`;
    const to = toKebabPath(dir);
    if (isDryRun) {
      console.log(`mv ${dir}/ -> ${to}/`);
    } else {
      move(root, from, to);
    }
  }

  let movedFiles = 0;
  for (const file of renamedFiles) {
    const base = path.posix.basename(file);
    if (toKebabSegment(base) === base) {
      continue;
    }
    movedFiles += 1;
    const from = `${toKebabPath(path.posix.dirname(file))}/${base}`;
    const to = toKebabPath(file);
    if (isDryRun) {
      console.log(`mv ${file} -> ${to}`);
    } else {
      move(root, from, to);
    }
  }

  console.log(
    `${isDryRun ? "Would rename" : "Renamed"} ${renamedFiles.length} files (${movedFiles} file names, ${folders.length} folders) and ${isDryRun ? "rewrite" : "rewrote"} ${rewritten.length} files.`
  );

  // New specifiers change import order and line length.
  const formattable = rewritten.filter((file) =>
    CODE_EXTENSIONS.has(path.posix.extname(file))
  );
  if (!isDryRun && formattable.length > 0) {
    formatFiles(root, formattable);
  }
};

if (import.meta.main) {
  run();
}
