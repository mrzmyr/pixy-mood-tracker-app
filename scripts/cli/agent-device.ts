// agent-device, pinned in package.json: devices, their owners, and e2e runs.
// Used by `bun e2e` and `bun dashboard`.
import path from "node:path";

import { REPO_ROOT } from "./runs.ts";
import { CliError } from "./shared.ts";

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

// Runs agent-device with --json and returns its data, or throws its error.
const agentDevice = async <T>(args: string[]): Promise<T> => {
  const child = Bun.spawn([AGENT_DEVICE, ...args, "--json"], {
    cwd: REPO_ROOT,
    stderr: "pipe",
    stdout: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
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

/** Runs agent-device and describes its devices and owners. */
export { AGENT_DEVICE, agentDevice };
export type { AgentDevice, Claim };
