// `bun sessions`: run e2e flows on a device and track, list, and stop runs.
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { findDevice, getAndroidBuildEnv, getTrustFix } from "./devices.ts";
import {
  getStaleReason,
  isActive,
  killSession,
  killStaleSessions,
  readSessions,
  sessionFile,
} from "./session-store.ts";
import {
  CliError,
  DEFAULT_MAX_AGE,
  FINISHED_SESSION_TTL_MS,
  HEARTBEAT_MS,
  LOGS_DIR,
  REPORTS_DIR,
  formatAge,
  getBranch,
  getWorktree,
  parseDuration,
  printTable,
  requireId,
  writeJson,
} from "./shared.ts";
import type {
  CliValues,
  Command,
  Device,
  Session,
  SessionStatus,
} from "./shared.ts";

// Resolves with the exit code; 127 when the binary could not start.
const waitForExit = async (child: ChildProcess) => {
  try {
    // SAFETY: a ChildProcess "exit" event passes (code: number | null, signal).
    const [code] = (await once(child, "exit")) as [number | null];
    return code ?? 1;
  } catch {
    return 127;
  }
};

// Print to the console and the session log, so old sessions show what ran.
const logLine = (log: number, line: string) => {
  console.log(line);
  fs.writeSync(log, `${line}\n`);
};

const getBuildEnv = (
  device: Device,
  isBuild: boolean
): Record<string, string> =>
  isBuild && device.platform === "android" ? getAndroidBuildEnv() : {};

const startBuild = (
  device: Device,
  log: number,
  buildEnv: Record<string, string>
) => {
  const args =
    device.platform === "ios"
      ? [
          "expo",
          "run:ios",
          "--device",
          device.id,
          "--configuration",
          "Release",
          "--no-bundler",
        ]
      : [
          "expo",
          "run:android",
          "--device",
          device.name,
          "--variant",
          "release",
          "--no-bundler",
        ];
  logLine(log, `Building: bunx ${args.join(" ")}`);
  return spawn("bunx", args, {
    cwd: getWorktree(),
    detached: true,
    env: { ...process.env, ...buildEnv, CI: "1" },
    stdio: ["ignore", log, log],
  });
};

const listFlowFiles = (target: string): string[] =>
  fs.statSync(target).isDirectory()
    ? fs
        .readdirSync(target)
        .flatMap((entry) => listFlowFiles(path.join(target, entry)))
    : [target].filter((file) => /\.ya?ml$/u.test(file));

// `clearState` as a command or launchApp option, outside YAML comments.
const CLEAR_STATE = /^[^#\n]*\bclearState\b/mu;

// Phones run installed TestFlight builds with real tester data.
const assertNoClearState = (flows: string[]) => {
  const unsafe = flows
    .flatMap(listFlowFiles)
    .filter((file) => CLEAR_STATE.test(fs.readFileSync(file, "utf-8")));
  if (unsafe.length > 0) {
    throw new CliError({
      fix: "Run these flows on a simulator or emulator, or pass flows without clearState.",
      message: "Flows with clearState cannot run on a physical device",
      status: "physical_clear_state",
      why: `clearState can remove tester data. Found in: ${unsafe.join(", ")}.`,
    });
  }
};

const assertRunnable = (device: Device) => {
  if (device.state === "unauthorized") {
    throw new CliError({
      fix: getTrustFix(device),
      message: `${device.name} is not ready for tests`,
      status: "device_unauthorized",
      why: "The phone is attached, but it has not trusted this Mac or developer access is off.",
    });
  }
  if (device.state !== "booted" && device.state !== "connected") {
    throw new CliError({
      fix: `Run \`bun devices boot ${device.id}\` first.`,
      message: `${device.name} is not running`,
      status: "device_not_running",
      why: `Device state is ${device.state}.`,
    });
  }
};

const cmdRun = async (
  id: string,
  flows: string[],
  options: { isBuild: boolean; isRecord: boolean; isForce: boolean }
) => {
  const device = findDevice(id);
  assertRunnable(device);
  const busy = readSessions().find(
    (session) => isActive(session) && session.deviceId === device.id
  );
  if (busy) {
    const staleReason = getStaleReason(busy, parseDuration(DEFAULT_MAX_AGE));
    if (!staleReason && !options.isForce) {
      throw new CliError({
        fix: "Pick another device, `bun devices create --platform ios`, or pass --force to take over.",
        message: `${device.name} is busy with session ${busy.id}`,
        status: "device_busy",
        why: `${path.basename(busy.worktree)} started it ${formatAge(busy.startedAt)} ago.`,
      });
    }
    await killSession(busy, staleReason ?? "taken over with --force");
  }
  const selectedFlows = flows.length > 0 ? flows : ["e2e/flows"];
  if (device.kind === "physical") {
    assertNoClearState(selectedFlows);
  }
  if (options.isBuild && device.kind === "physical") {
    throw new CliError({
      fix: "Install a TestFlight build on the phone, then run without --build.",
      message: "--build is not supported on physical devices",
      status: "build_physical_device",
      why: "Physical devices are tested with installed TestFlight builds.",
    });
  }

  // Resolve before the session exists, so a missing SDK or JDK leaves no record.
  const buildEnv = getBuildEnv(device, options.isBuild);

  const sessionId = `${new Date().toISOString().slice(5, 10).replace("-", "")}-${crypto.randomBytes(3).toString("hex")}`;
  const worktree = getWorktree();
  const now = new Date().toISOString();
  const session: Session = {
    branch: getBranch(),
    deviceId: device.id,
    deviceName: device.name,
    flows: selectedFlows,
    heartbeatAt: now,
    id: sessionId,
    kind: device.kind,
    logFile: path.join(LOGS_DIR, `${sessionId}.log`),
    pid: process.pid,
    platform: device.platform,
    reportDir: path.join(REPORTS_DIR, sessionId),
    startedAt: now,
    status: options.isBuild ? "building" : "running",
    worktree,
  };
  const save = () => writeJson(sessionFile(sessionId), session);
  save();
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  const log = fs.openSync(session.logFile, "a");
  console.log(`Session ${sessionId} on ${device.name} (${device.id})`);
  console.log(`Log: ${session.logFile}`);

  const heartbeat = setInterval(() => {
    session.heartbeatAt = new Date().toISOString();
    save();
  }, HEARTBEAT_MS);
  const finish = (status: SessionStatus, exitCode: number) => {
    clearInterval(heartbeat);
    Object.assign(session, {
      exitCode,
      finishedAt: new Date().toISOString(),
      status,
    });
    save();
  };
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.on(signal, () => {
      if (session.childPid) {
        try {
          process.kill(-session.childPid, "SIGTERM");
        } catch {
          // Already gone.
        }
      }
      finish("killed", 130);
      process.exit(130);
    });
  }

  if (options.isBuild) {
    const build = startBuild(device, log, buildEnv);
    session.childPid = build.pid;
    save();
    const buildCode = await waitForExit(build);
    if (buildCode !== 0) {
      finish("failed", buildCode);
      throw new CliError({
        fix: `Read ${session.logFile}, fix the build, and rerun.`,
        message: "App build failed",
        status: "build_failed",
        why: `expo run exited with code ${buildCode}.`,
      });
    }
    session.status = "running";
    save();
  }

  const runner = path.join(
    os.homedir(),
    ".maestro-runner",
    "bin",
    "maestro-runner"
  );
  const args = [
    "--platform",
    device.platform,
    "--device",
    device.id,
    "--no-ansi",
    // Never reinstall or wipe a phone's TestFlight build.
    ...(device.kind === "physical" ? ["--no-app-install"] : []),
    "test",
    "--output",
    session.reportDir,
    "--flatten",
    ...(options.isRecord ? ["--record"] : []),
    ...selectedFlows,
  ];
  logLine(log, `Running: maestro-runner ${args.join(" ")}`);
  const child = spawn(fs.existsSync(runner) ? runner : "maestro-runner", args, {
    cwd: worktree,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  session.childPid = child.pid;
  save();
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk: Buffer) => {
      process.stdout.write(chunk);
      fs.writeSync(log, chunk);
    });
  }
  const exitCode = await waitForExit(child);
  finish(exitCode === 0 ? "passed" : "failed", exitCode);
  console.log(
    `\nSession ${sessionId} ${session.status}. Report: ${session.reportDir}`
  );
  process.exitCode = exitCode;
};

const cmdSessions = (isAll: boolean, isJson: boolean) => {
  const maxAgeMs = parseDuration(DEFAULT_MAX_AGE);
  const sessions = readSessions()
    .filter((session) => isAll || isActive(session))
    .map((session) => ({
      ...session,
      staleReason: getStaleReason(session, maxAgeMs),
    }));
  if (isJson) {
    console.log(JSON.stringify(sessions, null, 2));
    return;
  }
  if (sessions.length === 0) {
    console.log(`No ${isAll ? "" : "running "}sessions.`);
    return;
  }
  printTable(
    ["ID", "STATUS", "DEVICE", "AGE", "WORKTREE", "FLOWS"],
    sessions.map((session) => [
      session.id,
      session.staleReason ? `stale (${session.staleReason})` : session.status,
      `${session.deviceName} ${session.deviceId}`,
      formatAge(session.startedAt),
      `${path.basename(session.worktree)} (${session.branch})`,
      session.flows.join(" "),
    ])
  );
};

const cmdKill = async (
  target: string | undefined,
  isStale: boolean,
  maxAge: string
) => {
  if (isStale) {
    const count = await killStaleSessions(parseDuration(maxAge), false);
    console.log(`${count} stale session(s) killed.`);
    return;
  }
  const session = readSessions().find(
    (candidate) =>
      isActive(candidate) &&
      (candidate.id === target || candidate.deviceId === target)
  );
  if (!session) {
    throw new CliError({
      fix: "Run `bun sessions list` and pass a session or device ID.",
      message: `No running session for ${target}`,
      status: "session_not_found",
      why: "No building or running session matches this ID.",
    });
  }
  await killSession(session, "killed by user");
};

const removeOldSessions = (isDryRun: boolean) => {
  const old = readSessions().filter(
    (session) =>
      !isActive(session) &&
      Date.now() - Date.parse(session.finishedAt ?? session.startedAt) >
        FINISHED_SESSION_TTL_MS
  );
  for (const session of old) {
    if (isDryRun) {
      console.log(`Would remove finished session ${session.id}`);
    } else {
      fs.rmSync(sessionFile(session.id), { force: true });
      fs.rmSync(session.logFile, { force: true });
      fs.rmSync(session.reportDir, { force: true, recursive: true });
    }
  }
};

const cmdGc = async (maxAge: string, isDryRun: boolean) => {
  const count = await killStaleSessions(parseDuration(maxAge), isDryRun);
  console.log(`${count} stale session(s) ${isDryRun ? "to kill" : "killed"}.`);
  removeOldSessions(isDryRun);
};

const SESSIONS_HELP = `Run e2e flows and track which test runs on which device.

Usage: bun sessions <command> [options]

  run <device-id> [flows...] [--build] [--record] [--force]
      Run Maestro flows through maestro-runner (default: e2e/flows).
      --build installs a release build of this worktree first
      (simulator/emulator, reused from the build cache when possible).
      --record keeps a video of every flow. --force takes over a busy device.
  list [--all] [--json]
      Sessions with device, flows, worktree, age, and status. --all includes
      finished sessions.
  kill <session-id|device-id> | kill --stale [--max-age ${DEFAULT_MAX_AGE}]
      Stop a session and all of its test processes.
  gc [--max-age ${DEFAULT_MAX_AGE}] [--dry-run]
      Kill stale sessions and delete finished ones older than 7 days.

A running session is stale when its process died, its heartbeat stopped for
2 minutes, or it runs longer than --max-age.`;

const SESSIONS_COMMANDS = new Map(
  Object.entries({
    gc: (_args, values) => cmdGc(values["max-age"], values["dry-run"] ?? false),
    help: () => console.log(SESSIONS_HELP),
    kill: ([target], values) =>
      cmdKill(target, values.stale ?? false, values["max-age"]),
    list: (_args, values) =>
      cmdSessions(values.all ?? false, values.json ?? false),
    run: ([id, ...flows], values: CliValues) =>
      cmdRun(requireId("bun sessions run <device-id> [flows...]", id), flows, {
        isBuild: values.build ?? false,
        isForce: values.force ?? false,
        isRecord: values.record ?? false,
      }),
  } satisfies Record<string, Command>)
);

/** `bun sessions` commands. */
export { SESSIONS_COMMANDS };
