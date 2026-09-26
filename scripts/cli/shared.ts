// Shared CLI types and helpers.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type Platform = "ios" | "android";

interface CliErrorFields {
  status: string;
  message: string;
  why: string;
  fix: string;
  // 2 for invalid usage (unknown command, option, or argument), 1 otherwise.
  exitCode?: number;
}

class CliError extends Error {
  status: string;
  why: string;
  fix: string;
  exitCode: number;

  constructor({ status, message, why, fix, exitCode = 1 }: CliErrorFields) {
    super(message);
    this.name = "CliError";
    this.status = status;
    this.why = why;
    this.fix = fix;
    this.exitCode = exitCode;
  }
}

const DEFAULT_KEEP_BUILDS = 3;
const DEFAULT_KEEP_WITHIN = "7d";

const run = (command: string, args: string[], timeout = 60_000) =>
  execFileSync(command, args, {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout,
  }).trim();

const tryRun = (command: string, args: string[], timeout?: number) => {
  try {
    return run(command, args, timeout);
  } catch {
    return null;
  }
};

const readJson = <T>(file: string): T | null => {
  try {
    // SAFETY: only these scripts and the e2e reporter write these files, always with the shape of T.
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return null;
  }
};

const parseDuration = (value: string) => {
  const match = /^(?<amount>\d+)(?<unit>[smhd])$/u.exec(value);
  if (!match) {
    throw new CliError({
      exitCode: 2,
      fix: "Use a number with s, m, h, or d, for example 45m or 2h.",
      message: `Invalid duration "${value}"`,
      status: "invalid_duration",
      why: "Durations need a unit.",
    });
  }
  const unitMs = { d: 86_400_000, h: 3_600_000, m: 60_000, s: 1000 };
  // SAFETY: the regex only matches the units s, m, h, and d.
  const unit = match.groups?.unit as keyof typeof unitMs;
  return Number(match.groups?.amount) * unitMs[unit];
};

const formatAge = (iso: string) => {
  const seconds = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (seconds < 90) {
    return `${seconds}s`;
  }
  if (seconds < 90 * 60) {
    return `${Math.round(seconds / 60)}m`;
  }
  return `${(seconds / 3600).toFixed(1)}h`;
};

const isProcessAlive = (pid: number | undefined) => {
  if (!pid) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const printTable = (columns: string[], rows: string[][]) => {
  const widths = columns.map((column, index) =>
    Math.max(column.length, ...rows.map((row) => row[index].length))
  );
  const line = (cells: string[]) =>
    cells
      .map((cell, index) => cell.padEnd(widths[index]))
      .join("  ")
      .trimEnd();
  console.log(line(columns));
  for (const row of rows) {
    console.log(line(row));
  }
};

const CHECKOUTS_DIR = path.join(
  os.homedir(),
  ".cache",
  "pixy-mood-tracker",
  "checkouts"
);
// Records which checkout a folder belongs to, so `bun builds prune` can remove
// folders of deleted worktrees.
const CHECKOUT_FILE = "checkout.txt";

// External state keyed by the checkout's real path.
const getCheckoutDir = (root: string) => {
  const checkout = fs.realpathSync(root);
  const hash = crypto
    .createHash("sha256")
    .update(checkout)
    .digest("hex")
    .slice(0, 12);
  const dir = path.join(CHECKOUTS_DIR, hash);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, CHECKOUT_FILE), `${checkout}\n`);
  return dir;
};

/** Keeps generated files in the checkout's external state directory. */
const getStateDir = (kind: "e2e" | "build" | "screenshots") => {
  const dir = path.join(
    getCheckoutDir(path.resolve(import.meta.dir, "../..")),
    kind
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

// Status messages go to stderr, so stdout stays pipeable.
const note = (message: string) => console.error(message);

const isPlatform = (value: string): value is Platform =>
  value === "ios" || value === "android";

const PLATFORM_OPTION = { platform: { type: "string" } } as const;

const getPlatform = (value: string | undefined) => {
  if (value === undefined || isPlatform(value)) {
    return value;
  }
  throw new CliError({
    exitCode: 2,
    fix: "Use --platform ios or --platform android.",
    message: `Unknown platform "${value}"`,
    status: "invalid_platform",
    why: "Only iOS and Android devices are supported.",
  });
};

type OptionSpec =
  | { type: "boolean"; short?: string }
  | { type: "string"; short?: string; default?: string };
type Options = Record<string, OptionSpec>;
// Unset boolean flags are undefined; string flags fall back to their default.
type OptionValue<S extends OptionSpec> = S extends { type: "boolean" }
  ? boolean | undefined
  : S extends { default: string }
    ? string
    : string | undefined;
type OptionValues<O extends Options> = { [K in keyof O]: OptionValue<O[K]> };

// One subcommand, such as `bun builds prune`. The entry point parses only the
// flags in `options`, so a flag of another command is an error.
interface CommandSpec<O extends Options = Options> {
  summary: string;
  // Positionals for usage and validation: `<id>` is required, `[paths...]`
  // is optional and variadic.
  args?: string[];
  // Where to find a valid value for a missing argument.
  argsSource?: string;
  options?: O;
  // Accept `-- <args>` and pass them to `run` unparsed.
  hasPassthrough?: boolean;
  // Usage after `bun <noun> <verb>`, when it should name required flags.
  // Generated from args and options when unset.
  usage?: string;
  // Extra help: what the options do, defaults, and side effects.
  details?: string;
  run: (
    args: string[],
    values: OptionValues<O>,
    passthrough: string[]
  ) => Promise<void> | void;
}

const defineCommand = <const O extends Options = Record<never, never>>(
  spec: CommandSpec<O>
) =>
  // SAFETY: the entry point parses flags with exactly `spec.options`.
  spec as CommandSpec;

interface Noun {
  summary: string;
  commands: Record<string, CommandSpec>;
  // Shown after the command list in `bun <noun> --help`.
  footer?: string;
}

/** Types, constants, and helpers shared by the CLIs. */
export {
  CHECKOUTS_DIR,
  CHECKOUT_FILE,
  CliError,
  DEFAULT_KEEP_BUILDS,
  DEFAULT_KEEP_WITHIN,
  PLATFORM_OPTION,
  defineCommand,
  formatAge,
  getCheckoutDir,
  getStateDir,
  getPlatform,
  isProcessAlive,
  note,
  parseDuration,
  printTable,
  readJson,
  tryRun,
};
export type { CommandSpec, Noun, Platform };
