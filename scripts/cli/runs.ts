// E2E runs: the run.json that scripts/cli/e2e-reporter.mjs writes into each
// checkout's external state directory. Read by `bun e2e` and `bun dashboard`.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { CHECKOUTS_DIR, isProcessAlive, readJson, tryRun } from "./shared.ts";
import type { Platform } from "./shared.ts";

interface RunFlow {
  artifactsDir: string;
  attempts: number;
  durationMs: number | null;
  file: string;
  message: string | null;
  status: string;
  video: string | null;
}

// Written by scripts/cli/e2e-reporter.mjs.
interface Run {
  branch: string;
  deviceId: string | null;
  finishedAt: string | null;
  flows: RunFlow[];
  id: string;
  pid: number;
  pidStartedAt: string | null;
  platform: Platform | null;
  startedAt: string;
  // "stopped": ended by `bun e2e stop`, which writes it.
  status: "running" | "passed" | "failed" | "stopped";
  worktree: string;
}

const REPO_ROOT = path.resolve(import.meta.dir, "../..");
const runDir = (run: Run) => {
  const hash = crypto
    .createHash("sha256")
    .update(run.worktree)
    .digest("hex")
    .slice(0, 12);
  return path.join(CHECKOUTS_DIR, hash, "e2e", run.id);
};

// Oldest first.
const readRuns = () =>
  (fs.existsSync(CHECKOUTS_DIR) ? fs.readdirSync(CHECKOUTS_DIR) : [])
    .flatMap((hash) => {
      const root = path.join(CHECKOUTS_DIR, hash, "e2e");
      return fs.existsSync(root)
        ? fs
            .readdirSync(root)
            .map((id) => readJson<Run>(path.join(root, id, "run.json")))
            .filter((run): run is Run => run !== null)
        : [];
    })
    .toSorted((a, b) => a.startedAt.localeCompare(b.startedAt));

const findRun = (id: string) => readRuns().find((run) => run.id === id) ?? null;

// PIDs get reused, so the process must also have the start time the reporter
// recorded. Runs without one never count as alive.
const isRunProcessAlive = (run: Run) =>
  isProcessAlive(run.pid) &&
  Boolean(run.pidStartedAt) &&
  tryRun("ps", ["-o", "lstart=", "-p", String(run.pid)]) === run.pidStartedAt;

// A run whose CLI process died never wrote its final status.
const getStaleReason = (run: Run) =>
  run.status === "running" && !isRunProcessAlive(run)
    ? "its agent-device process exited without a result"
    : null;

const isActive = (run: Run) => run.status === "running" && !getStaleReason(run);

// agent-device skips reporter hooks on SIGINT, so a stopped run would stay
// "running" forever.
const markStopped = (run: Run) => {
  const file = path.join(runDir(run), "run.json");
  const tmp = `${file}.${process.pid}.tmp`;
  const stopped: Run = {
    ...run,
    finishedAt: new Date().toISOString(),
    status: "stopped",
  };
  fs.writeFileSync(tmp, `${JSON.stringify(stopped, null, 2)}\n`);
  fs.renameSync(tmp, file);
};

/** Reads and classifies e2e runs across all worktrees. */
export {
  REPO_ROOT,
  findRun,
  markStopped,
  getStaleReason,
  isActive,
  isRunProcessAlive,
  readRuns,
  runDir,
};
export type { Run, RunFlow };
