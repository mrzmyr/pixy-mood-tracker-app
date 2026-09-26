// One native build per checkout and platform at a time. Runs in one worktree
// share android/ and ios/, so `expo prebuild --clean` in one run would wipe
// the folder another run compiles in. The second run waits, then usually finds
// the first run's build in the cache. Worktrees and platforms never block each
// other.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { CliError, getCheckoutDir, isProcessAlive, note } from "./shared.ts";
import type { Platform, Steps } from "./shared.ts";

interface LockHolder {
  pid: number;
  // Start time from `ps`. A reused PID has another one.
  startedAt: string;
  command: string;
}

interface LockOptions {
  holder: LockHolder;
  isAlive: (holder: LockHolder) => boolean;
  pollMs: number;
  onWait: (holder: LockHolder) => void;
  // Stops processes `work` started, such as xcodebuild or Gradle, before a
  // signal releases the lock. They would keep writing to the checkout.
  stopWork?: (signal: NodeJS.Signals) => Promise<void>;
}

// `LC_ALL=C` keeps the format the same for runs with other locales.
const getStartTime = (pid: number) => {
  try {
    return execFileSync("ps", ["-o", "lstart=", "-p", String(pid)], {
      encoding: "utf-8",
      env: { ...process.env, LC_ALL: "C" },
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
};

const isHolderAlive = (holder: LockHolder) =>
  isProcessAlive(holder.pid) && getStartTime(holder.pid) === holder.startedAt;

const readText = (file: string) => {
  try {
    return fs.readFileSync(file, "utf-8");
  } catch {
    return null;
  }
};

const parseHolder = (text: string) => {
  try {
    // SAFETY: only `acquire` writes lock files, always as a LockHolder.
    return JSON.parse(text) as LockHolder;
  } catch {
    return null;
  }
};

// A reaper holds this only for one read and one unlink. Older means its run
// was killed in between.
const REAPER_STALE_MS = 10_000;

// Removes a lock whose holder is dead. One waiter at a time reaps, holding an
// exclusive reaper directory. It unlinks the lock only while it still holds
// `staleText`: a new holder can only link its lock after the unlink, and a
// dead holder never releases. Returns false when another waiter reaps.
const removeStale = (file: string, staleText: string) => {
  const reaper = `${file}.reaper`;
  try {
    fs.mkdirSync(reaper);
  } catch {
    const reaperAt = fs.statSync(reaper, { throwIfNoEntry: false })?.mtimeMs;
    if (reaperAt !== undefined && Date.now() - reaperAt > REAPER_STALE_MS) {
      fs.rmSync(reaper, { force: true, recursive: true });
    }
    return false;
  }
  try {
    if (readText(file) === staleText) {
      fs.rmSync(file, { force: true });
    }
    return true;
  } finally {
    fs.rmSync(reaper, { force: true, recursive: true });
  }
};

// Writes the holder to a temp file and hard-links it into place. `link` fails
// when the lock exists, so two runs never both win, and readers never see a
// half-written lock.
const acquire = async (file: string, options: LockOptions) => {
  const text = `${JSON.stringify(options.holder)}\n`;
  const draft = `${file}.${options.holder.pid}.draft`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(draft, text);
  let announced = "";
  try {
    // oxlint-disable-next-line no-constant-condition -- polls until the lock is free
    while (true) {
      try {
        fs.linkSync(draft, file);
        return text;
      } catch (error) {
        // `link` fails with EEXIST while another run holds the lock.
        if (!fs.existsSync(file)) {
          throw new CliError({
            fix: `Check that ${path.dirname(file)} is writable, then retry.`,
            message: "Could not take the build lock",
            status: "build_lock_failed",
            why: error instanceof Error ? error.message : String(error),
          });
        }
      }
      const current = readText(file);
      const holder = current === null ? null : parseHolder(current);
      const isStale = current !== null && (!holder || !options.isAlive(holder));
      if (!isStale && holder && current !== announced) {
        options.onWait(holder);
        announced = current ?? "";
      }
      // Retries at once after reaping or when the lock just vanished.
      if (current !== null && !(isStale && removeStale(file, current))) {
        // oxlint-disable-next-line no-await-in-loop -- polling must wait between checks
        await sleep(options.pollMs);
      }
    }
  } finally {
    fs.rmSync(draft, { force: true });
  }
};

// Holds the lock while `work` runs. Releases it when `work` ends or throws, and
// on Ctrl-C or SIGTERM, which skip `finally`: those stop `work`'s processes
// first. A lock left by a killed run is taken over once its holder is dead.
const withLock = async <T>(
  file: string,
  work: () => Promise<T>,
  options: LockOptions
): Promise<T> => {
  const text = await acquire(file, options);
  const release = () => {
    if (readText(file) === text) {
      fs.rmSync(file, { force: true });
    }
  };
  const onSignal = async (signal: NodeJS.Signals) => {
    try {
      await options.stopWork?.(signal);
    } finally {
      release();
      process.exit(signal === "SIGINT" ? 130 : 143);
    }
  };
  process.on("exit", release);
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  try {
    return await work();
  } finally {
    release();
    process.off("exit", release);
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
  }
};

const getBuildLockFile = (root: string, platform: Platform) =>
  path.join(getCheckoutDir(root), `${platform}-build.lock`);

// Waiting is its own step, so the step timings show it.
const withBuildLock = <T>(
  root: string,
  platform: Platform,
  steps: Steps,
  stopWork: (signal: NodeJS.Signals) => Promise<void>,
  work: () => Promise<T>
) => {
  let isWaiting = false;
  return withLock(getBuildLockFile(root, platform), work, {
    holder: {
      command: `bun ${process.argv.slice(2).join(" ")}`,
      pid: process.pid,
      startedAt: getStartTime(process.pid),
    },
    isAlive: isHolderAlive,
    onWait: (holder) => {
      if (!isWaiting) {
        isWaiting = true;
        steps.step(`Wait for another ${platform} build in this worktree`);
      }
      note(`  Held by PID ${holder.pid}: ${holder.command}`);
    },
    pollMs: 2000,
    stopWork,
  });
};

/** Serializes native builds per checkout and platform. */
export { withBuildLock };
