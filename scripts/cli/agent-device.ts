import fs from "node:fs";
import { X509Certificate } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { getAndroidSdk } from "../run-native.ts";
import {
  checkDaemonEnv,
  findDaemonHolders,
  staleDaemonError,
} from "./daemon-env.ts";
import { CliError, isProcessAlive, note, readJson, tryRun } from "./shared.ts";

const REPO_ROOT = path.resolve(import.meta.dir, "../..");
const AGENT_DEVICE = path.join(
  REPO_ROOT,
  "node_modules",
  ".bin",
  "agent-device"
);
const STATE_DIR = path.join(os.homedir(), ".agent-device");
const RUNNER_BUNDLE_ID = "com.devmood.pixymoodtracker.agentdevice";
let wasDaemonChecked = false;

const readSigningTeams = () => {
  const pem = tryRun("security", [
    "find-certificate",
    "-a",
    "-c",
    "Apple Development",
    "-p",
  ]);
  const certs =
    pem?.match(
      /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/gu
    ) ?? [];
  return [
    ...new Set(
      certs.flatMap((cert) => {
        const x509 = new X509Certificate(cert);
        if (Date.parse(x509.validTo) < Date.now()) {
          return [];
        }
        return (
          /^OU=(?<team>[A-Z0-9]{10})$/mu.exec(x509.subject)?.groups?.team ?? []
        );
      })
    ),
  ];
};

let agentDeviceEnv: NodeJS.ProcessEnv | null = null;

const getAgentDeviceEnv = () => {
  if (!agentDeviceEnv) {
    const teams = process.env.AGENT_DEVICE_IOS_TEAM_ID
      ? []
      : readSigningTeams();
    const derived: NodeJS.ProcessEnv = {};
    const sdk = getAndroidSdk();
    if (sdk) {
      derived.ANDROID_HOME = sdk;
      derived.ANDROID_SDK_ROOT = sdk;
    }
    if (teams.length === 1) {
      [derived.AGENT_DEVICE_IOS_TEAM_ID] = teams;
      derived.AGENT_DEVICE_IOS_BUNDLE_ID = RUNNER_BUNDLE_ID;
    }
    agentDeviceEnv = { ...derived, ...process.env };
  }
  return agentDeviceEnv;
};

const getRunnerBundleId = () => {
  const env = getAgentDeviceEnv();
  return (
    env.AGENT_DEVICE_IOS_BUNDLE_ID?.trim() ||
    env.AGENT_DEVICE_IOS_RUNNER_APP_BUNDLE_ID?.trim() ||
    "com.callstack.agentdevice.runner"
  );
};

const redactSigningTeam = (text: string) => {
  const team = getAgentDeviceEnv().AGENT_DEVICE_IOS_TEAM_ID?.trim();
  return team ? text.replaceAll(team, "<team>") : text;
};

const STOP_DAEMON = `bunx agent-device daemon stop --state-dir ${STATE_DIR.replace(os.homedir(), "~")}`;

// A daemon started from a deleted worktree cannot load its own modules.
const stopStaleDaemon = async () => {
  if (wasDaemonChecked) {
    return;
  }
  const info = readJson<{ pid?: number; scriptPath?: string }>(
    path.join(STATE_DIR, "daemon.json")
  );
  const pid = info?.pid;
  if (!pid || !isProcessAlive(pid)) {
    wasDaemonChecked = true;
    return;
  }
  const command = tryRun("ps", ["-o", "command=", "-p", String(pid)]) ?? "";
  const script =
    info.scriptPath ??
    /(?<script>\/\S*node_modules\/agent-device\/\S+\.js)/u.exec(command)?.groups
      ?.script;
  if (!script || fs.existsSync(script)) {
    wasDaemonChecked = true;
    return;
  }
  tryRun(AGENT_DEVICE, ["daemon", "stop", "--state-dir", STATE_DIR]);
  const deadline = Date.now() + 5000;
  while (isProcessAlive(pid) && Date.now() < deadline) {
    // oxlint-disable-next-line no-await-in-loop -- wait for daemon exit
    await sleep(200);
  }
  if (isProcessAlive(pid)) {
    process.kill(pid, "SIGKILL");
  }
  note(`note: stopped stale agent-device daemon from ${script}`);
  wasDaemonChecked = true;
};

interface AgentDeviceResult<T> {
  success?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    hint?: string;
    logPath?: string;
    details?: { reason?: string };
  };
}

// agent-device keeps one default session per checkout and platform. Simulator
// and phones of one platform would share it, so each phone gets its own.
let phoneSession: string | null = null;

/** Run later device commands in a session named after the phone target. */
const setPhoneSession = (target: string) => {
  phoneSession = target;
};

const getSessionArgs = (args: string[]) =>
  phoneSession && (args.includes("--udid") || args.includes("--serial"))
    ? ["--session", phoneSession]
    : [];

const agentDevice = async <T>(
  args: string[],
  options: { timeoutMs?: number } = {}
): Promise<T> => {
  await stopStaleDaemon();
  const command = [AGENT_DEVICE, ...args, ...getSessionArgs(args), "--json"];
  const child = Bun.spawn(command, {
    cwd: REPO_ROOT,
    env: getAgentDeviceEnv(),
    stderr: "pipe",
    stdout: "pipe",
  });
  const output = Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  const abort = new AbortController();
  const expire = async (
    timeoutMs: number
  ): Promise<[string, string, number]> => {
    try {
      await sleep(timeoutMs, null, { signal: abort.signal });
    } catch {
      return ["", "", 0];
    }
    child.kill();
    throw new CliError({
      status: "agent_device_timeout",
      message: `agent-device ${args[0]} timed out`,
      why: `Command did not answer within ${timeoutMs / 1000}s.`,
      fix: "Check device state, then retry.",
    });
  };
  let result: [string, string, number];
  try {
    result = await Promise.race(
      options.timeoutMs ? [output, expire(options.timeoutMs)] : [output]
    );
  } finally {
    abort.abort();
  }
  const [stdout, stderr] = result;
  let body: AgentDeviceResult<T> | null;
  try {
    // SAFETY: agent-device --json prints one result object.
    body = JSON.parse(stdout) as AgentDeviceResult<T>;
  } catch {
    body = null;
  }
  if (body?.success && body.data !== undefined) {
    return body.data;
  }
  const error = body?.error;
  throw new CliError({
    status: error?.code?.toLowerCase() ?? "agent_device_failed",
    message: redactSigningTeam(
      error?.message ?? `agent-device ${args[0]} failed`
    ),
    why: redactSigningTeam(
      [stderr.trim(), error?.details?.reason, error?.logPath]
        .filter(Boolean)
        .join(" ") || "agent-device returned no successful JSON result."
    ),
    fix: redactSigningTeam(
      error?.hint ?? `Run \`bunx agent-device ${args[0]} --help\`, then retry.`
    ),
  });
};

const ensureDaemonSigningEnv = async () => {
  const info = path.join(STATE_DIR, "daemon.json");
  note("Check agent-device daemon signing environment");
  const pid = readJson<{ pid?: number }>(info)?.pid;
  const state = checkDaemonEnv(
    getAgentDeviceEnv(),
    pid ? tryRun("ps", ["eww", "-o", "command=", "-p", String(pid)]) : null
  );
  if (
    state.kind === "missing" ||
    state.kind === "unreadable" ||
    state.kind === "current"
  ) {
    return;
  }
  const { claims } = await agentDevice<{
    claims: {
      classification: string;
      device: { id: string; name: string; platform: string; kind: "device" };
      owner: {
        session: string;
        workspace: string;
        pid: number;
        startTime: string;
      };
    }[];
  }>(["device", "status"]);
  const holders = findDaemonHolders(claims);
  if (holders.length) {
    throw staleDaemonError(state.keys, holders, STOP_DAEMON);
  }
  tryRun(AGENT_DEVICE, ["daemon", "stop", "--state-dir", STATE_DIR]);
  for (let attempt = 0; attempt < 25 && isProcessAlive(pid); attempt += 1) {
    // oxlint-disable-next-line no-await-in-loop -- poll daemon shutdown
    await sleep(200);
  }
  if (isProcessAlive(pid)) {
    throw new CliError({
      status: "agent_device_daemon_stop_failed",
      message: "agent-device daemon did not stop",
      why: `Daemon still runs after ${STOP_DAEMON}.`,
      fix: `Run ${STOP_DAEMON}, then retry.`,
    });
  }
  note(
    "Stopped stale agent-device daemon; next call starts it with signing environment"
  );
};

export {
  AGENT_DEVICE,
  agentDevice,
  ensureDaemonSigningEnv,
  getAgentDeviceEnv,
  getRunnerBundleId,
  readSigningTeams,
  redactSigningTeam,
  STATE_DIR,
  stopStaleDaemon,
  setPhoneSession,
};
