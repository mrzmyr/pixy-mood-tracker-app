import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { CliError, isProcessAlive, note, readJson } from "./shared.ts";

const BUILD_TIMEOUT_MS = 30 * 60_000;
const MISSING_OWNER_GRACE_MS = 10_000;

interface LockOwner {
  pid: number;
  startedAt: string;
}

const getStartedAt = (pid: number) =>
  execFileSync("ps", ["-o", "lstart=", "-p", String(pid)], {
    encoding: "utf-8",
    env: { ...process.env, LC_ALL: "C" },
  }).trim();

const getStaleOwner = (lock: string): LockOwner | null => {
  const owner = readJson<LockOwner>(path.join(lock, "owner.json"));
  if (!owner || !Number.isInteger(owner.pid) || !owner.startedAt) {
    return Date.now() - fs.statSync(lock).mtimeMs > MISSING_OWNER_GRACE_MS
      ? { pid: owner?.pid ?? 0, startedAt: "" }
      : null;
  }
  if (!isProcessAlive(owner.pid)) {
    return owner;
  }
  try {
    return getStartedAt(owner.pid) === owner.startedAt ? null : owner;
  } catch {
    return owner;
  }
};

/** Serialize one cache key across worktrees and reclaim locks from dead owners. */
export const withCacheLock = async (
  file: string,
  work: () => Promise<void>
): Promise<void> => {
  const lock = `${file}.lock`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const deadline = Date.now() + BUILD_TIMEOUT_MS;
  while (!fs.existsSync(file)) {
    try {
      fs.mkdirSync(lock);
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "EEXIST")
      ) {
        throw new CliError({
          status: "build_lock_failed",
          message: "Could not create build cache lock",
          why: error instanceof Error ? error.message : String(error),
          fix: "Check build cache permissions, then retry.",
        });
      }
      const stale = getStaleOwner(lock);
      if (stale) {
        fs.rmSync(lock, { recursive: true, force: true });
        note(`note: removed stale build lock of pid ${stale.pid}`);
        continue;
      }
      if (Date.now() >= deadline) {
        throw new CliError({
          status: "build_lock_timeout",
          message: "Build cache remained locked",
          why: `Another build held ${lock} for 30 minutes.`,
          fix: "Check the other build process, then retry.",
        });
      }
      // oxlint-disable-next-line no-await-in-loop -- wait for current lock owner
      await sleep(1000);
      continue;
    }

    const release = () => fs.rmSync(lock, { recursive: true, force: true });
    const onSignal = (signal: NodeJS.Signals) => {
      release();
      process.removeListener(signal, onSignal);
      process.kill(process.pid, signal);
    };
    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);
    try {
      fs.writeFileSync(
        path.join(lock, "owner.json"),
        JSON.stringify({
          pid: process.pid,
          startedAt: getStartedAt(process.pid),
        })
      );
      if (!fs.existsSync(file)) {
        // oxlint-disable-next-line no-await-in-loop -- one lock owner builds
        await work();
      }
    } finally {
      process.removeListener("SIGINT", onSignal);
      process.removeListener("SIGTERM", onSignal);
      release();
    }
    return;
  }
};
