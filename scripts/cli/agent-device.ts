import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { getAndroidSdk } from "../run-native.ts";
import { CliError, isProcessAlive, note, readJson, tryRun } from "./shared.ts";

const REPO_ROOT = path.resolve(import.meta.dir, "../..");
const AGENT_DEVICE = path.join(
  REPO_ROOT,
  "node_modules",
  ".bin",
  "agent-device"
);
const STATE_DIR = path.join(os.homedir(), ".agent-device");
let wasDaemonChecked = false;

const getAgentDeviceEnv = () => {
  const sdk = getAndroidSdk();
  return sdk
    ? { ...process.env, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk }
    : process.env;
};

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

const agentDevice = async <T>(
  args: string[],
  options: { timeoutMs?: number } = {}
): Promise<T> => {
  await stopStaleDaemon();
  const child = Bun.spawn([AGENT_DEVICE, ...args, "--json"], {
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
    message: error?.message ?? `agent-device ${args[0]} failed`,
    why:
      [stderr.trim(), error?.details?.reason, error?.logPath]
        .filter(Boolean)
        .join(" ") || "agent-device returned no successful JSON result.",
    fix:
      error?.hint ?? `Run \`bunx agent-device ${args[0]} --help\`, then retry.`,
  });
};

export { AGENT_DEVICE, agentDevice, getAgentDeviceEnv, stopStaleDaemon };
