import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { assertHostReady } from "./disk.ts";
import {
  CACHE_DIR,
  CliError,
  isProcessAlive,
  note,
  readJson,
} from "./shared.ts";

const REPO_ROOT = path.resolve(import.meta.dir, "../..");
const BUILD_TIMEOUT_MS = 30 * 60_000;
const MISSING_OWNER_GRACE_MS = 10_000;
const SLOTS_DIR = path.join(CACHE_DIR, "build-slots");
const BUILD_SLOTS = 2;
const SLOT_TIMEOUT_MS = 90 * 60_000;

interface LockOwner {
  pid: number;
  startedAt: string;
  checkout?: string;
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

const createLock = (lock: string) => {
  try {
    fs.mkdirSync(lock);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") {
      return false;
    }
    throw new CliError({
      status: "build_lock_failed",
      message: "Could not create build lock",
      why: error instanceof Error ? error.message : String(error),
      fix: "Check build cache permissions, then retry.",
    });
  }
};

const removeStaleLock = (lock: string) => {
  const stale = getStaleOwner(lock);
  if (!stale) {
    return false;
  }
  fs.rmSync(lock, { recursive: true, force: true });
  note(`note: removed stale build lock of pid ${stale.pid}`);
  return true;
};

// Run work while this process owns the lock. Ctrl-C releases it too.
const holdLock = async (lock: string, work: () => Promise<void>) => {
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
        checkout: REPO_ROOT,
      } satisfies LockOwner)
    );
    await work();
  } finally {
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
    release();
  }
};

const describeHolders = (locks: string[]) =>
  locks
    .map((lock) => readJson<LockOwner>(path.join(lock, "owner.json")))
    .map((owner) =>
      owner
        ? `${owner.checkout ?? "unknown checkout"} (pid ${owner.pid})`
        : "starting"
    )
    .join(", ");

/**
 * Run one native compile in one of BUILD_SLOTS machine-wide slots.
 * More parallel compiles overload CPU and fill the disk.
 */
const withBuildSlot = async (work: () => Promise<void>) => {
  fs.mkdirSync(SLOTS_DIR, { recursive: true });
  const locks = Array.from({ length: BUILD_SLOTS }, (_, index) =>
    path.join(SLOTS_DIR, `slot-${index + 1}`)
  );
  const deadline = Date.now() + SLOT_TIMEOUT_MS;
  let lastHolders = "";
  for (;;) {
    const free = locks.find(
      (lock) => createLock(lock) || (removeStaleLock(lock) && createLock(lock))
    );
    if (free) {
      // oxlint-disable-next-line no-await-in-loop -- leave the loop after work
      await holdLock(free, work);
      return;
    }
    const holders = describeHolders(locks);
    if (holders !== lastHolders) {
      note(
        `Waiting for a build slot. ${BUILD_SLOTS} native builds run: ${holders}`
      );
      lastHolders = holders;
    }
    if (Date.now() >= deadline) {
      throw new CliError({
        status: "build_slot_timeout",
        message: "No build slot became free",
        why: `${BUILD_SLOTS} native builds held all slots for ${SLOT_TIMEOUT_MS / 60_000} minutes: ${holders}.`,
        fix: "Check the other build processes, then retry.",
      });
    }
    // oxlint-disable-next-line no-await-in-loop -- wait for a slot owner
    await sleep(2000);
  }
};

/**
 * Serialize one cache key across worktrees and reclaim locks from dead owners.
 * The compile itself waits for a machine-wide build slot and checks free disk.
 */
export const withCacheLock = async (
  file: string,
  work: () => Promise<void>
): Promise<void> => {
  const lock = `${file}.lock`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const deadline = Date.now() + BUILD_TIMEOUT_MS;
  while (!fs.existsSync(file)) {
    if (!createLock(lock)) {
      if (removeStaleLock(lock)) {
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
    // oxlint-disable-next-line no-await-in-loop -- one lock owner builds
    await holdLock(lock, async () => {
      if (fs.existsSync(file)) {
        return;
      }
      await withBuildSlot(async () => {
        assertHostReady();
        await work();
      });
    });
    return;
  }
};
