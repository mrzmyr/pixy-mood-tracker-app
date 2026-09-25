// Session records: one JSON file per e2e run, shared by all worktrees.
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import {
  HEARTBEAT_STALE_MS,
  SESSIONS_DIR,
  formatAge,
  isProcessAlive,
  readDir,
  writeJson,
} from "./shared.ts";
import type { Session, SessionBuild } from "./shared.ts";

const sessionFile = (id: string) => path.join(SESSIONS_DIR, `${id}.json`);

// Messages from scripts/build-cache-provider.cjs in a session log.
const CACHE_HIT =
  /› Using cached build \S*\/(?<key>[^/\s]+?)(?:\.app|\.apk)?\s*$/mu;
const CACHE_SAVE =
  /› Saved build to cache \S*\/(?<key>[^/\s]+?)(?:\.app|\.apk)?\s*$/mu;
const CACHE_MISS = /› No cached build for (?<key>\S+)/u;

// Reads which build a session installed from its log. Sessions from before
// builds were recorded have only their log.
const readBuildFromLog = (logFile: string): SessionBuild => {
  let log = "";
  try {
    log = fs.readFileSync(logFile, "utf-8");
  } catch {
    // No log: nothing was built.
  }
  const hit = CACHE_HIT.exec(log)?.groups?.key;
  if (hit) {
    return { installedBy: null, key: hit, source: "cache", version: null };
  }
  const built =
    CACHE_SAVE.exec(log)?.groups?.key ?? CACHE_MISS.exec(log)?.groups?.key;
  return {
    installedBy: null,
    key: built ?? null,
    source: built ? "built" : "installed",
    version: null,
  };
};

const readSessions = () =>
  readDir<Session>(SESSIONS_DIR).toSorted((a, b) =>
    a.startedAt.localeCompare(b.startedAt)
  );

const isActive = (session: Session) =>
  session.status === "building" || session.status === "running";

// Explains why an active session is stale, or returns null when healthy.
const getStaleReason = (session: Session, maxAgeMs: number) => {
  if (!isActive(session)) {
    return null;
  }
  if (!isProcessAlive(session.pid)) {
    return "process exited";
  }
  if (Date.now() - Date.parse(session.heartbeatAt) > HEARTBEAT_STALE_MS) {
    return "heartbeat stopped";
  }
  if (Date.now() - Date.parse(session.startedAt) > maxAgeMs) {
    return `older than ${formatAge(new Date(Date.now() - maxAgeMs).toISOString())}`;
  }
  return null;
};

// A test's process group can outlive its leader: when the leader dies,
// children such as xcodebuild keep running with the same group ID.
const isGroupAlive = (pid: number) =>
  isProcessAlive(pid) || isProcessAlive(-pid);

const killProcessTree = async (pid: number | undefined) => {
  if (!pid || !isGroupAlive(pid)) {
    return;
  }
  const signal = (name: NodeJS.Signals) => {
    // Test processes run in their own group; the negative PID reaches all.
    for (const target of [-pid, pid]) {
      try {
        process.kill(target, name);
      } catch {
        // Already gone.
      }
    }
  };
  signal("SIGTERM");
  await sleep(3000);
  if (isGroupAlive(pid)) {
    signal("SIGKILL");
  }
};

const killSession = async (session: Session, reason: string) => {
  await killProcessTree(session.childPid);
  await killProcessTree(session.pid);
  writeJson(sessionFile(session.id), {
    ...session,
    finishedAt: new Date().toISOString(),
    status: "killed",
  } satisfies Session);
  console.log(`Killed ${session.id} on ${session.deviceName} (${reason})`);
};

// Kills every active session that is stale for `maxAgeMs`.
const killStaleSessions = async (maxAgeMs: number, isDryRun: boolean) => {
  const stale = readSessions().flatMap((session) => {
    const reason = getStaleReason(session, maxAgeMs);
    return reason ? [{ reason, session }] : [];
  });
  if (isDryRun) {
    for (const { reason, session } of stale) {
      console.log(`Would kill ${session.id} (${reason})`);
    }
    return stale.length;
  }
  await Promise.all(
    stale.map(({ reason, session }) => killSession(session, reason))
  );
  return stale.length;
};

/** Reads, classifies, and stops e2e sessions. */
export {
  getStaleReason,
  isActive,
  killSession,
  killStaleSessions,
  readBuildFromLog,
  readSessions,
  sessionFile,
};
