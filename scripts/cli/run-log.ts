// Progress markers for long commands (native build, install, e2e, dev).
// Agents run these in the background and watch one log file:
//   Log: <path>                 first stderr line, unique file per run
//   Step N/M: <name>            one line per phase, on stderr and in the log
//   PIXY_RESULT status=...      last stdout line, also on failure
// Every line also lands in the log file with a synchronous write, so
// `tail -F <path>` sees it at once.
import fs from "node:fs";
import path from "node:path";

/** Log files kept per checkout. Older run logs are deleted at run start. */
export const RUN_LOGS_KEPT = 30;

interface RunResult {
  status: "ok" | "error";
  command: string;
  /** CliError status on failure. */
  code?: string;
  /** Artifact of the run: build file, screenshot, or artifacts folder. */
  path?: string;
}

// Values with whitespace are JSON-quoted, so `key=value` splitting stays safe.
const formatValue = (value: string) =>
  /\s/u.test(value) ? JSON.stringify(value) : value;

/** Format the final machine-readable line of a long command. */
export const formatResultLine = ({
  status,
  command,
  code,
  path: artifact,
}: RunResult) =>
  [
    "PIXY_RESULT",
    `status=${status}`,
    `command=${command}`,
    ...(code ? [`code=${formatValue(code)}`] : []),
    ...(artifact ? [`path=${formatValue(artifact)}`] : []),
  ].join(" ");

/** Format one progress line. Number is the position in the command's step list. */
export const formatStepLine = (steps: readonly string[], name: string) => {
  const index = steps.indexOf(name);
  return index === -1
    ? `Step: ${name}`
    : `Step ${index + 1}/${steps.length}: ${name}`;
};

/** Unique log file name: command, UTC start time, process ID. */
export const formatRunLogName = (
  command: string,
  startedAt: Date,
  pid: number
) =>
  `${command}-${startedAt
    .toISOString()
    .replaceAll(/[-:]/gu, "")
    .replace(/\.\d+Z$/u, "Z")}-${pid}.log`;

/** Names of run logs to delete so that `keep` newest logs remain. */
export const selectLogsToPrune = (
  logs: readonly { name: string; mtimeMs: number }[],
  keep: number
) =>
  [...logs]
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(keep)
    .map((log) => log.name);

interface ActiveRun {
  file: string;
  fd: number;
  steps: readonly string[];
  resultPath?: string;
}

let active: ActiveRun | null = null;

/** Append raw output to the active run log. No-op without an active run. */
export const appendRunLog = (text: string | Uint8Array) => {
  if (active) {
    fs.writeSync(active.fd, text);
  }
};

const emit = (stream: NodeJS.WriteStream, line: string) => {
  stream.write(`${line}\n`);
  appendRunLog(`${line}\n`);
};

const pruneRunLogs = (dir: string) => {
  const logs = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".log"))
    .map((name) => ({
      name,
      mtimeMs: fs.statSync(path.join(dir, name)).mtimeMs,
    }));
  for (const name of selectLogsToPrune(logs, RUN_LOGS_KEPT - 1)) {
    fs.rmSync(path.join(dir, name), { force: true });
  }
};

/** Open a new log file for this run and print `Log: <path>` first. */
export const startRunLog = ({
  dir,
  command,
  steps,
}: {
  dir: string;
  command: string;
  steps: readonly string[];
}) => {
  fs.mkdirSync(dir, { recursive: true });
  pruneRunLogs(dir);
  const file = path.join(
    dir,
    formatRunLogName(command, new Date(), process.pid)
  );
  active = { file, fd: fs.openSync(file, "a"), steps };
  emit(process.stderr, `Log: ${file}`);
  return file;
};

/**
 * Sink for child process output: the active run log, else a new log file in
 * `dir` named after `name`.
 */
export const openOutputLog = (dir: string, name: string) => {
  if (active) {
    const { file } = active;
    return {
      file,
      write: appendRunLog,
      close: () => {
        // The run log closes at the end of the command.
      },
    };
  }
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, formatRunLogName(name, new Date(), process.pid));
  const fd = fs.openSync(file, "a");
  process.stderr.write(`Log: ${file}\n`);
  return {
    file,
    write: (text: string | Uint8Array) => {
      fs.writeSync(fd, text);
    },
    close: () => fs.closeSync(fd),
  };
};

/** Print `Step N/M: <name>` for the active run. No-op without an active run. */
export const step = (name: string) => {
  if (active) {
    emit(process.stderr, formatStepLine(active.steps, name));
  }
};

/** Name the artifact that the final result line reports. */
export const setResultPath = (artifact: string) => {
  if (active) {
    active.resultPath = artifact;
  }
};

/** Print the final `PIXY_RESULT` line on stdout and close the run log. */
export const finishRunLog = (command: string, failure?: { status: string }) => {
  emit(
    process.stdout,
    formatResultLine({
      status: failure ? "error" : "ok",
      command,
      code: failure?.status,
      path: active?.resultPath,
    })
  );
  if (active) {
    fs.closeSync(active.fd);
    active = null;
  }
};
