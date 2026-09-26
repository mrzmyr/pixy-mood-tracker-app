// agent-device, pinned in package.json: devices, their owners, and e2e runs.
// Used by `bun e2e` and `bun dashboard`.
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
import { REPO_ROOT } from "./runs.ts";
import { CliError, isProcessAlive, note, readJson, tryRun } from "./shared.ts";
import type { Platform, Steps } from "./shared.ts";

interface AgentDevice {
  id: string;
  name: string;
  platform: string;
  kind: "simulator" | "emulator" | "device";
  booted?: boolean;
}

// An agent-device session holding a device. "live" owners are still running.
interface Claim {
  classification: string;
  device: AgentDevice;
  owner: { session: string; workspace: string; pid: number; startTime: string };
}

const AGENT_DEVICE = path.join(
  REPO_ROOT,
  "node_modules",
  ".bin",
  "agent-device"
);

const RUNNER_BUNDLE_ID = "com.devmood.pixymoodtracker.agentdevice";

// Teams of the valid Apple Development certificates on this Mac, read from
// each certificate's subject OU, like Expo CLI does.
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
  const teams = certs.flatMap((cert) => {
    const x509 = new X509Certificate(cert);
    if (Date.parse(x509.validTo) < Date.now()) {
      return [];
    }
    return (
      /^OU=(?<team>[A-Z0-9]{10})$/mu.exec(x509.subject)?.groups?.team ?? []
    );
  });
  return [...new Set(teams)];
};

let agentDeviceEnv: NodeJS.ProcessEnv | null = null;

// Environment for agent-device. On physical iPhones, agent-device needs a
// signed runner app. The daemon reads the signing team at start, so every
// call passes it, and ensureDaemonSigningEnv restarts a daemon started
// without it. Values set by the user win. With several teams, nothing is
// set and agent-device fails with signing_no_development_team and a hint.
const getAgentDeviceEnv = () => {
  if (!agentDeviceEnv) {
    const teams = process.env.AGENT_DEVICE_IOS_TEAM_ID
      ? []
      : readSigningTeams();
    const derived: NodeJS.ProcessEnv = {};
    // agent-device finds emulators through ANDROID_HOME. Its daemon keeps
    // the environment of the command that started it.
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

// What `agent-device --json` prints.
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

// The reason names the classified cause, for example a signing failure.
// The log is xcodebuild's runner log when the runner failed to start.
const toCliError = <T>(
  args: string[],
  body: AgentDeviceResult<T> | null,
  stderr: string
) => {
  const error = body?.error;
  const why = [
    stderr.trim(),
    error?.details?.reason ? `Reason: ${error.details.reason}.` : "",
    error?.logPath ? `Log: ${error.logPath}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return new CliError({
    fix:
      error?.hint ??
      `Run \`bunx agent-device ${args.join(" ")}\` in a terminal to see the full output.`,
    message: error?.message ?? `agent-device ${args[0]} failed`,
    status: error?.code?.toLowerCase() ?? "agent_device_failed",
    why:
      why ||
      (body
        ? "agent-device gave no details."
        : "agent-device returned no JSON result."),
  });
};

// Bundle ID of agent-device's iOS runner app, resolved like agent-device does.
const getRunnerBundleId = () => {
  const env = getAgentDeviceEnv();
  return (
    env.AGENT_DEVICE_IOS_BUNDLE_ID?.trim() ||
    env.AGENT_DEVICE_IOS_RUNNER_APP_BUNDLE_ID?.trim() ||
    "com.callstack.agentdevice.runner"
  );
};

// Runs agent-device with --json and returns its data, or throws its error.
// `timeoutMs` stops a hanging call, so a stuck device cannot block the CLI
// and its cleanup forever.
const agentDevice = async <T>(
  args: string[],
  options: { timeoutMs?: number } = {}
): Promise<T> => {
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
  // On timeout, stop waiting at once: agent-device's child processes
  // (xcodebuild, the runner) can keep its output open after it is killed.
  const abort = new AbortController();
  const expire = async (
    timeoutMs: number
  ): Promise<[string, string, number]> => {
    try {
      await sleep(timeoutMs, null, { signal: abort.signal });
    } catch {
      // Aborted: the output won the race, so this value is never used.
      return ["", "", 0];
    }
    child.kill();
    throw new CliError({
      fix: "Check the device is unlocked and connected, then retry. Run `bun app close --device <id>` to reset it.",
      message: `agent-device ${args[0]} timed out`,
      status: "agent_device_timeout",
      why: `\`agent-device ${args.join(" ")}\` did not answer within ${timeoutMs / 1000}s.`,
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
  let body: AgentDeviceResult<T> | null = null;
  try {
    // SAFETY: agent-device --json prints one { success, data | error } object.
    body = JSON.parse(stdout);
  } catch {
    body = null;
  }
  if (body?.success && body.data !== undefined) {
    return body.data;
  }
  throw toCliError(args, body, stderr);
};

// Lists devices through the shared daemon, so it also catches a daemon that
// runs another agent-device version.
const listAgentDevices = async () => {
  try {
    const { devices } = await agentDevice<{ devices: AgentDevice[] }>([
      "devices",
    ]);
    return devices;
  } catch (error) {
    if (
      error instanceof CliError &&
      /newer than this client/u.test(`${error.message} ${error.why}`)
    ) {
      throw new CliError({
        fix: "Check `bunx agent-device device status` for live sessions of other worktrees and tell their owners. Then run `bunx agent-device daemon stop --state-dir ~/.agent-device` and retry.",
        message: "agent-device daemon runs another version",
        status: "agent_device_version_mismatch",
        why: `${error.message} All worktrees share one daemon. Someone started it with \`bunx agent-device@latest\` instead of the version pinned in package.json.`,
      });
    }
    throw error;
  }
};

// State dir of the daemon all worktrees share.
const STATE_DIR =
  process.env.AGENT_DEVICE_STATE_DIR ??
  path.join(os.homedir(), ".agent-device");
const STOP_DAEMON = `bunx agent-device daemon stop --state-dir ${STATE_DIR.replace(os.homedir(), "~")}`;

// Physical iPhones only. The daemon reads the signing values of
// getAgentDeviceEnv only at start. When another command started it without
// them, stops it, so the next call restarts it with them. Fails instead when
// live sessions hold the daemon.
const ensureDaemonSigningEnv = async (steps: Steps) => {
  const info = path.join(STATE_DIR, "daemon.json");
  steps.step(
    "Check the agent-device daemon has the iOS signing team",
    `ps eww -o command= -p <pid in ${info.replace(os.homedir(), "~")}>`
  );
  const pid = readJson<{ pid?: number }>(info)?.pid;
  const state = checkDaemonEnv(
    getAgentDeviceEnv(),
    pid ? tryRun("ps", ["eww", "-o", "command=", "-p", String(pid)]) : null
  );
  if (state.kind === "missing") {
    note("  ok: no daemon runs; the next call starts it with the team");
    return;
  }
  if (state.kind === "unreadable") {
    note("  warning: cannot read the daemon environment; skipped");
    return;
  }
  if (state.kind === "current") {
    note("  ok: daemon has the team");
    return;
  }
  const { claims } = await agentDevice<{ claims: Claim[] }>([
    "device",
    "status",
  ]);
  const holders = findDaemonHolders(claims);
  if (holders.length > 0) {
    throw staleDaemonError(state.keys, holders, STOP_DAEMON);
  }
  steps.step(
    `Stop the daemon: it lacks ${state.keys.join(" and ")}, and no live session holds it`,
    STOP_DAEMON
  );
  tryRun(AGENT_DEVICE, ["daemon", "stop", "--state-dir", STATE_DIR]);
  for (let attempt = 0; attempt < 25 && isProcessAlive(pid); attempt += 1) {
    // oxlint-disable-next-line no-await-in-loop -- polling must wait between checks
    await sleep(200);
  }
  if (isProcessAlive(pid)) {
    throw new CliError({
      fix: `Run \`${STOP_DAEMON}\` in a terminal to see its output, then retry.`,
      message: "agent-device daemon did not stop",
      status: "agent_device_daemon_stop_failed",
      why: `Daemon PID ${pid} still runs 5s after \`${STOP_DAEMON}\`.`,
    });
  }
  note("  ok: stopped; the next call restarts it with the team");
};

const describeAgentDevice = (device: AgentDevice) =>
  `${device.id} (${device.platform} ${device.kind === "device" ? "physical" : device.kind}, ${device.name})`;

// `--device <id|name>` is the only device selector of the bun CLIs. It takes
// the UDID or serial, or the device name. Platform and simulator vs physical
// come from the device.
const findAgentDevice = (devices: AgentDevice[], selector: string) => {
  const byName = devices.filter(
    (candidate) => candidate.name.toLowerCase() === selector.toLowerCase()
  );
  const device =
    devices.find((candidate) => candidate.id === selector) ??
    (byName.length === 1 ? byName[0] : undefined);
  if (byName.length > 1 && !device) {
    throw new CliError({
      exitCode: 2,
      fix: `Pass the ID instead:\n       ${byName.map(describeAgentDevice).join("\n       ")}`,
      message: `${byName.length} devices are named ${selector}`,
      status: "device_ambiguous",
      why: "A name selects a device only when no other device has it.",
    });
  }
  if (!device) {
    const known = devices.map(describeAgentDevice);
    throw new CliError({
      exitCode: 2,
      fix: known.length
        ? `Pass one of these IDs or names:\n       ${known.join("\n       ")}`
        : "Connect a phone, or boot a device with `bunx agent-device boot --platform <ios|android> --device <name>`.",
      message: `No device ${selector}`,
      status: "device_not_found",
      why: "agent-device lists no device with this ID or name. Phones must be connected and unlocked.",
    });
  }
  if (device.platform !== "ios" && device.platform !== "android") {
    throw new CliError({
      exitCode: 2,
      fix: "Pass an iOS or Android device.",
      message: `${device.name} is a ${device.platform} device`,
      status: "invalid_platform",
      why: "The bun CLIs support iOS and Android only.",
    });
  }
  // SAFETY: the check above allows only ios and android.
  return { device, platform: device.platform as Platform };
};

/** Runs agent-device and describes its devices and owners. */
export {
  AGENT_DEVICE,
  agentDevice,
  ensureDaemonSigningEnv,
  findAgentDevice,
  getAgentDeviceEnv,
  getRunnerBundleId,
  listAgentDevices,
};
export type { AgentDevice, Claim };
