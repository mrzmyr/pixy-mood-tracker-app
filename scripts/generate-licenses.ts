/**
 * Writes `assets/licenses.txt`: third-party notices for Settings > Licenses.
 *
 * Covers only the production dependency tree: `dependencies` and
 * `optionalDependencies` of `package.json`, followed through `node_modules`.
 * Dev tools (`devDependencies`) are not shipped, so they are not listed.
 * Packages with identical license text share one section. Sections are
 * separated by `-----`, which the Licenses screen splits on.
 *
 * Usage: `bun run licenses` (after `bun install`)
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const ROOT = path.join(import.meta.dir, "..");
const OUTPUT_PATH = path.join(ROOT, "assets/licenses.txt");
const SEPARATOR = "\n\n-----\n\n";
const HEADER =
  "THE FOLLOWING SETS FORTH ATTRIBUTION NOTICES FOR THIRD PARTY SOFTWARE THAT MAY BE CONTAINED IN PORTIONS OF THE PIXY MOOD TRACKER PRODUCT.";
const LICENSE_FILE = /^(?:licen[cs]e|copying)(?:\b|[.\-_])/iu;

const versionMap = z.record(z.string(), z.string()).optional();
/** Fields read from a `package.json`. Legacy object forms become strings. */
const packageJsonSchema = z.object({
  name: z.string().optional(),
  license: z
    .union([z.string(), z.object({ type: z.string().optional() })])
    .optional()
    .transform((value) => (value instanceof Object ? value.type : value)),
  repository: z
    .union([z.string(), z.object({ url: z.string().optional() })])
    .optional()
    .transform((value) => (value instanceof Object ? value.url : value)),
  dependencies: versionMap,
  optionalDependencies: versionMap,
});
type PackageJson = z.infer<typeof packageJsonSchema>;

interface Notice {
  name: string;
  source?: string;
  text: string;
}

/** Structured script failure, see AGENTS.md Errors. */
class LicensesError extends Error {
  status: string;
  why: string;
  fix: string;

  constructor(fields: {
    status: string;
    message: string;
    why: string;
    fix: string;
  }) {
    super(fields.message);
    this.name = "LicensesError";
    this.status = fields.status;
    this.why = fields.why;
    this.fix = fields.fix;
  }
}

const readPackageJson = (dir: string): PackageJson =>
  packageJsonSchema.parse(
    JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8"))
  );

/** Node resolution: nearest `node_modules/<name>` from `fromDir` upwards. */
const resolvePackageDir = (
  name: string,
  fromDir: string,
  rootDir: string
): string | null => {
  let dir = fromDir;
  while (true) {
    const candidate = path.join(dir, "node_modules", name);
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      return fs.realpathSync(candidate);
    }
    const parent = path.dirname(dir);
    if (parent === dir || !dir.startsWith(rootDir)) {
      return null;
    }
    dir = parent;
  }
};

const licenseText = (dir: string, pkg: PackageJson) => {
  const [file] = fs
    .readdirSync(dir)
    .filter((entry) => LICENSE_FILE.test(entry))
    .toSorted();
  if (file && fs.statSync(path.join(dir, file)).isFile()) {
    return fs.readFileSync(path.join(dir, file), "utf-8").trim();
  }
  return pkg.license ?? "UNKNOWN";
};

/** Every package reachable from the app's production dependencies. */
export const collectNotices = (rootDir: string): Notice[] => {
  const root = readPackageJson(rootDir);
  const seen = new Set<string>();
  const notices: Notice[] = [];
  const queue: { name: string; from: string; optional: boolean }[] = [
    ...Object.keys(root.dependencies ?? {}).map((name) => ({
      name,
      from: rootDir,
      optional: false,
    })),
    ...Object.keys(root.optionalDependencies ?? {}).map((name) => ({
      name,
      from: rootDir,
      optional: true,
    })),
  ];

  for (let next = queue.shift(); next; next = queue.shift()) {
    const { name, from, optional } = next;
    const dir = resolvePackageDir(name, from, rootDir);
    if (!dir) {
      if (optional) {
        continue;
      }
      throw new LicensesError({
        status: "licenses_dependency_missing",
        message: `Dependency ${name} is not installed`,
        why: `${name} is required by ${path.relative(rootDir, from) || "package.json"} but no node_modules folder has it`,
        fix: "Run `bun install`, then run `bun run licenses` again",
      });
    }
    if (seen.has(dir)) {
      continue;
    }
    seen.add(dir);
    const pkg = readPackageJson(dir);
    notices.push({
      name: pkg.name ?? name,
      source: pkg.repository,
      text: licenseText(dir, pkg),
    });
    for (const dep of Object.keys(pkg.dependencies ?? {})) {
      queue.push({ name: dep, from: dir, optional: false });
    }
    for (const dep of Object.keys(pkg.optionalDependencies ?? {})) {
      queue.push({ name: dep, from: dir, optional: true });
    }
  }
  return notices;
};

/** Groups packages with identical license text into one section each. */
export const formatNotices = (notices: Notice[]) => {
  const groups = new Map<string, Notice[]>();
  for (const notice of notices) {
    groups.set(notice.text, [...(groups.get(notice.text) ?? []), notice]);
  }
  const sections = [...groups.entries()]
    .map(([text, members]) => {
      const sorted = members.toSorted((a, b) => a.name.localeCompare(b.name));
      const names = [...new Set(sorted.map((member) => member.name))];
      const sources = [
        ...new Set(sorted.flatMap((member) => member.source ?? [])),
      ];
      const sourceLine =
        sources.length > 0
          ? ` A copy of the source code may be downloaded from ${sources.join(", ")}.`
          : "";
      return {
        first: names[0],
        body: `The following software may be included in this product: ${names.join(", ")}.${sourceLine} This software contains the following license and notice below:\n\n${text}`,
      };
    })
    .toSorted((a, b) => a.first.localeCompare(b.first));
  return `${[HEADER, ...sections.map((section) => section.body)].join(SEPARATOR)}\n`;
};

if (import.meta.main) {
  try {
    const notices = collectNotices(ROOT);
    fs.writeFileSync(OUTPUT_PATH, formatNotices(notices));
    console.log(
      `Wrote ${path.relative(ROOT, OUTPUT_PATH)}: ${notices.length} packages`
    );
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
