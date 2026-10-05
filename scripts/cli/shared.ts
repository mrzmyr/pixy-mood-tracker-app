import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { format } from "node:util";

import { appendRunLog } from "./run-log.ts";

type Platform = "ios" | "android";
interface OptionSpec {
  /** Placeholder after `=`. Omit for a flag, which takes no value. */
  value?: string;
  description: string[];
  isRequired?: boolean;
  choices?: readonly string[];
  invalidStatus?: string;
}
interface HelpSection {
  title: "Behavior" | "Requires" | "Output" | "Examples";
  lines: string[];
}
interface CommandSpec {
  summary: string;
  usage?: string;
  options?: Record<string, OptionSpec>;
  exactlyOne?: string[];
  sections?: HelpSection[];
  errors?: Record<string, string>;
  successWord?: "ok" | "pass";
  /** Long command: gets a run log, `Step N/M` lines, and a final `PIXY_RESULT` line. */
  steps?: readonly string[];
  run: (values: Record<string, string | undefined>) => Promise<void> | void;
}

interface CliErrorFields {
  status: string;
  message: string;
  why: string;
  fix: string;
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
const CHECKOUT_FILE = "checkout.txt";

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

const getStateDir = (kind: "e2e" | "build" | "screenshots" | "logs") => {
  const dir = path.join(
    getCheckoutDir(path.resolve(import.meta.dir, "../..")),
    kind
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

// Notes also land in the run log, so `tail -F` on it shows them.
const note = (message: string) => {
  process.stderr.write(`${message}\n`);
  appendRunLog(`${message}\n`);
};

// The build cache provider logs with console.log, as Expo CLI expects.
// CLI stdout carries results only, so its lines go to stderr here.
const withLogsOnStderr = async <T>(work: () => Promise<T>): Promise<T> => {
  const { log } = console;
  console.log = (...args: unknown[]) => note(format(...args));
  try {
    return await work();
  } finally {
    console.log = log;
  }
};

const defineCommand = (spec: CommandSpec) => spec;

interface Noun {
  summary: string;
  commands: Record<string, CommandSpec>;
  footer?: string;
  helpTail?: string[];
  commandOrder?: string[];
}

export {
  CHECKOUTS_DIR,
  CHECKOUT_FILE,
  CliError,
  defineCommand,
  formatAge,
  getCheckoutDir,
  getStateDir,
  isProcessAlive,
  note,
  withLogsOnStderr,
  printTable,
  readJson,
  tryRun,
};
export type { CommandSpec, HelpSection, Noun, OptionSpec, Platform };
