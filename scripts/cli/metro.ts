// Metro for `bun app dev`, one per checkout. Each worktree gets its own port,
// PID file, and log, so parallel worktrees never load, read, or stop each
// other's Metro. The dev client connects by deep link with this port.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { CliError, getCheckoutDir, isProcessAlive, note } from "./shared.ts";

const REPO_ROOT = path.resolve(import.meta.dir, "../..");
const CHECKOUT_DIR = getCheckoutDir(REPO_ROOT);
// Ports 8082-8181, derived from the checkout hash, so a worktree keeps its
// port. 8081 stays free for a human `bun start`.
const METRO_PORT =
  8082 + (Number.parseInt(path.basename(CHECKOUT_DIR).slice(0, 8), 16) % 100);
const METRO_LOG = path.join(CHECKOUT_DIR, "metro.log");
// Written by `app dev`, so `app close` stops only a Metro this CLI started.
const METRO_PID = path.join(CHECKOUT_DIR, "metro.pid");
const START_TIMEOUT_MS = 120_000;

const readPid = (pidFile: string) => {
  const pid = fs.existsSync(pidFile)
    ? Math.trunc(Number(fs.readFileSync(pidFile, "utf-8")))
    : Number.NaN;
  return Number.isInteger(pid) && pid > 0 ? pid : undefined;
};

const isMetroRunning = async (port: number) => {
  try {
    const response = await fetch(`http://localhost:${port}/status`, {
      signal: AbortSignal.timeout(1000),
    });
    const body = await response.text();
    return body.includes("packager-status:running");
  } catch {
    return false;
  }
};

// Stops the Metro process group named in `dir/metro.pid`. A dead PID is
// skipped. Returns true when a process was signalled.
const stopMetroIn = (dir: string) => {
  const pidFile = path.join(dir, "metro.pid");
  const pid = readPid(pidFile);
  fs.rmSync(pidFile, { force: true });
  if (!isProcessAlive(pid)) {
    return false;
  }
  try {
    // SAFETY: readPid returns a positive integer when isProcessAlive is true.
    process.kill(-(pid as number), "SIGINT");
    return true;
  } catch {
    return false;
  }
};

/** Stops this checkout's Metro when this CLI started it. */
const stopMetro = () => {
  if (stopMetroIn(CHECKOUT_DIR)) {
    note(`Stopped Metro on port ${METRO_PORT}`);
  }
};

// Polls until Metro answers. `exitReason` names why the process is gone, or
// returns null while it runs.
const waitForMetro = async (exitReason: () => string | null) => {
  const deadline = Date.now() + START_TIMEOUT_MS;
  // oxlint-disable-next-line no-await-in-loop -- polling must wait between checks
  while (!(await isMetroRunning(METRO_PORT))) {
    const reason = exitReason();
    if (reason !== null || Date.now() > deadline) {
      throw new CliError({
        fix: `Read ${METRO_LOG}, fix the error, then retry.`,
        message: "Metro did not start",
        status: "metro_start_failed",
        why:
          reason ??
          `No answer on port ${METRO_PORT} within ${START_TIMEOUT_MS / 1000} seconds.`,
      });
    }
    // oxlint-disable-next-line no-await-in-loop -- polling must wait between checks
    await sleep(1000);
  }
};

interface Metro {
  port: number;
  log: string;
  /** Dev server URL the dev client loads from. */
  url: string;
}

/** Starts Metro (`bun start`) unless this checkout's Metro already runs. */
const startMetro = async (): Promise<Metro> => {
  const metro = {
    log: METRO_LOG,
    port: METRO_PORT,
    url: `http://localhost:${METRO_PORT}`,
  };
  const ownPid = readPid(METRO_PID);
  if (isProcessAlive(ownPid)) {
    // Another run in this checkout may still be starting it.
    await waitForMetro(() =>
      isProcessAlive(ownPid) ? null : `Metro (PID ${ownPid}) exited.`
    );
    note(`Metro already runs on port ${METRO_PORT}`);
    return metro;
  }
  if (await isMetroRunning(METRO_PORT)) {
    throw new CliError({
      fix: `Stop the process on port ${METRO_PORT} (\`lsof -i :${METRO_PORT}\`), then retry.`,
      message: `Port ${METRO_PORT} is taken`,
      status: "metro_port_taken",
      why: `A server answers on port ${METRO_PORT}, but ${METRO_PID} names no running Metro of this checkout.`,
    });
  }
  const log = fs.openSync(METRO_LOG, "w");
  // Own process group, so Metro outlives `bun app dev` and `stopMetro` also
  // stops the Expo process that `bun start` launches.
  const child = spawn(
    process.execPath,
    ["start", "--port", String(METRO_PORT)],
    {
      cwd: REPO_ROOT,
      detached: true,
      // Expo reads keyboard shortcuts only from a TTY; stdin is ignored here.
      // CI must stay unset: Expo disables the file watcher under CI.
      env: { ...process.env, CI: undefined },
      stdio: ["ignore", log, log],
    }
  );
  child.unref();
  fs.closeSync(log);
  fs.writeFileSync(METRO_PID, `${child.pid}\n`);
  try {
    await waitForMetro(() =>
      child.exitCode === null
        ? null
        : `\`bun start\` exited with ${child.exitCode}.`
    );
  } catch (error) {
    stopMetroIn(CHECKOUT_DIR);
    throw error;
  }
  note(`Metro started on port ${METRO_PORT}; log: ${METRO_LOG}`);
  return metro;
};

/** True while the Metro that `bun app dev` started for this checkout runs. */
const isOwnMetroRunning = () => isProcessAlive(readPid(METRO_PID));

/** Starts, finds, and stops this checkout's Metro. */
export {
  METRO_LOG,
  METRO_PORT,
  isOwnMetroRunning,
  startMetro,
  stopMetro,
  stopMetroIn,
};
export type { Metro };
