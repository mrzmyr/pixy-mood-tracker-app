// agent-device, pinned in package.json: devices, their owners, and e2e runs.
// Used by `bun e2e` and `bun dashboard`.
import { X509Certificate } from "node:crypto";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { getAndroidSdk } from "../run-native.ts";
import { REPO_ROOT } from "./runs.ts";
import { CliError, tryRun } from "./shared.ts";
import type { Platform } from "./shared.ts";

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
// call passes it. Values set by the user win. With several teams, nothing is
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
  let body: {
    success?: boolean;
    data?: T;
    error?: { code?: string; message?: string; hint?: string };
  } | null = null;
  try {
    // SAFETY: agent-device --json prints one { success, data | error } object.
    body = JSON.parse(stdout);
  } catch {
    body = null;
  }
  if (body?.success && body.data !== undefined) {
    return body.data;
  }
  throw new CliError({
    fix:
      body?.error?.hint ??
      `Run \`bunx agent-device ${args.join(" ")}\` in a terminal to see the full output.`,
    message: body?.error?.message ?? `agent-device ${args[0]} failed`,
    status: body?.error?.code?.toLowerCase() ?? "agent_device_failed",
    why: stderr.trim() || "agent-device returned no JSON result.",
  });
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

// `--device <id>` is the only device selector of the bun CLIs. Platform and
// simulator vs physical come from the device.
const findAgentDevice = (devices: AgentDevice[], id: string) => {
  const device = devices.find((candidate) => candidate.id === id);
  if (!device) {
    const known = devices.map(
      (candidate) =>
        `${candidate.id} (${candidate.platform} ${candidate.kind === "device" ? "physical" : candidate.kind}, ${candidate.name})`
    );
    throw new CliError({
      exitCode: 2,
      fix: known.length
        ? `Pass one of:\n       ${known.join("\n       ")}`
        : "Connect a phone, or boot a device with `bunx agent-device boot --platform <ios|android> --device <name>`.",
      message: `No device ${id}`,
      status: "device_not_found",
      why: "agent-device does not list it. Phones must be connected and unlocked.",
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
  findAgentDevice,
  getAgentDeviceEnv,
  listAgentDevices,
};
export type { AgentDevice, Claim };
