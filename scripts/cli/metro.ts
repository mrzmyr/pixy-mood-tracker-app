// Metro for development runs of `bun app run`, one per checkout. Each
// worktree gets its own port, PID file, and log, so parallel worktrees never
// load, read, or stop each other's Metro.
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { spawn } from "node:child_process";

import { REPO_ROOT } from "./runs.ts";
import { CliError, getCheckoutDir, isProcessAlive, note } from "./shared.ts";
import type { Steps } from "./shared.ts";

const pass = (message: string) => note(`  ok: ${message}`);

const CHECKOUT_DIR = getCheckoutDir(REPO_ROOT);
// Per checkout, so each worktree's Metro serves its own code. Ports 8082-8181,
// derived from the checkout folder's hash, so a worktree keeps its port.
// 8081 stays free for `bun start`.
const METRO_PORT =
  8082 + (Number.parseInt(path.basename(CHECKOUT_DIR).slice(0, 8), 16) % 100);
// Per checkout, so worktrees never read or stop each other's Metro.
const METRO_LOG = path.join(CHECKOUT_DIR, "metro.log");
// Written by `app run`, so `app close` stops only a Metro this CLI started.
const METRO_PID = path.join(CHECKOUT_DIR, "metro.pid");

const readMetroPid = () => {
  const pid = fs.existsSync(METRO_PID)
    ? Math.trunc(Number(fs.readFileSync(METRO_PID, "utf-8")))
    : Number.NaN;
  return Number.isInteger(pid) ? pid : undefined;
};

const isMetroRunning = async () => {
  try {
    const response = await fetch(`http://localhost:${METRO_PORT}/status`, {
      signal: AbortSignal.timeout(1000),
    });
    const body = await response.text();
    return body.includes("packager-status:running");
  } catch {
    return false;
  }
};

// Stops Metro's process group by PID and removes the PID file. A dead PID is
// skipped.
const stopMetro = (pid: number | undefined) => {
  if (!pid) {
    return false;
  }
  fs.rmSync(METRO_PID, { force: true });
  try {
    process.kill(-pid, "SIGINT");
    return true;
  } catch {
    return false;
  }
};

// Polls until Metro answers. `exitReason` names why the Metro process is gone,
// or returns null while it runs.
const waitForMetro = async (exitReason: () => string | null) => {
  const deadline = Date.now() + 120_000;
  // oxlint-disable-next-line no-await-in-loop -- polling must wait between checks
  while (!(await isMetroRunning())) {
    const reason = exitReason();
    if (reason !== null || Date.now() > deadline) {
      throw new CliError({
        fix: `Read ${METRO_LOG}, fix the error, then retry.`,
        message: "Metro did not start",
        status: "metro_start_failed",
        why: reason ?? `No answer on port ${METRO_PORT} within 2 minutes.`,
      });
    }
    // oxlint-disable-next-line no-await-in-loop -- polling must wait between checks
    await sleep(1000);
  }
};

// Starts Metro (`bun start`) unless this worktree's Metro already runs.
// Returns the process this CLI started, or null.
const startMetro = async (steps: Steps) => {
  steps.step("Start Metro", `bun start --port ${METRO_PORT}`);
  const ownPid = readMetroPid();
  if (isProcessAlive(ownPid)) {
    // Another run in this worktree may still be starting it.
    await waitForMetro(() =>
      isProcessAlive(ownPid) ? null : `Metro (PID ${ownPid}) exited.`
    );
    pass(`this worktree's Metro already runs on port ${METRO_PORT}`);
    return null;
  }
  if (await isMetroRunning()) {
    throw new CliError({
      fix: `Stop the process on port ${METRO_PORT} (\`lsof -i :${METRO_PORT}\`), then retry.`,
      message: `Port ${METRO_PORT} is taken`,
      status: "metro_port_taken",
      why: `A server answers on port ${METRO_PORT}, but ${METRO_PID} names no running Metro of this worktree.`,
    });
  }
  const log = fs.openSync(METRO_LOG, "w");
  // Own process group, so Metro outlives `bun app run` and `stopMetro` also
  // stops the Expo process that `bun start` launches.
  const child = spawn("bun", ["start", "--port", String(METRO_PORT)], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: ["ignore", log, log],
  });
  child.unref();
  fs.writeFileSync(METRO_PID, `${child.pid}\n`);
  try {
    await waitForMetro(() =>
      child.exitCode === null
        ? null
        : `\`bun start\` exited with ${child.exitCode}.`
    );
  } catch (error) {
    stopMetro(child.pid);
    throw error;
  }
  pass(`running on port ${METRO_PORT}, log: ${METRO_LOG}`);
  return child;
};

/** Starts, finds, and stops this checkout's Metro. */
export {
  METRO_LOG,
  METRO_PID,
  METRO_PORT,
  readMetroPid,
  startMetro,
  stopMetro,
};
