// Checks the shared agent-device daemon runs with the iOS signing values this
// CLI passes. The daemon reads them only at start, so a daemon started by a
// raw `bunx agent-device` call keeps signing the runner with agent-device's
// default team. Pure logic; agent-device.ts reads the daemon and stops it.
import type { Claim } from "./agent-device.ts";
import { CliError } from "./shared.ts";

// Values the runner signing reads from the daemon's process.env.
const SIGNING_KEYS = [
  "AGENT_DEVICE_IOS_TEAM_ID",
  "AGENT_DEVICE_IOS_BUNDLE_ID",
] as const;

// One variable from `ps eww -o command= -p <pid>`: the command line, then the
// environment as space-separated NAME=value pairs.
const readPsEnv = (psOutput: string, key: string) =>
  new RegExp(`(?:^|\\s)${key}=(?<value>\\S*)`, "u").exec(psOutput)?.groups
    ?.value;

type DaemonEnvState =
  | { kind: "missing" }
  | { kind: "unreadable" }
  | { kind: "current" }
  | { kind: "stale"; keys: string[] };

// Compares the daemon's environment with the one the CLI passes. Keys the CLI
// leaves unset do not count. `psOutput` is null when no daemon runs.
const checkDaemonEnv = (
  expected: NodeJS.ProcessEnv,
  psOutput: string | null
): DaemonEnvState => {
  if (!psOutput || !/agent-device\S*daemon/u.test(psOutput)) {
    return { kind: "missing" };
  }
  // macOS hides the environment of processes it protects.
  if (readPsEnv(psOutput, "HOME") === undefined) {
    return { kind: "unreadable" };
  }
  const keys = SIGNING_KEYS.filter((key) => {
    const want = expected[key]?.trim();
    return want && readPsEnv(psOutput, key) !== want;
  });
  return keys.length > 0 ? { kind: "stale", keys } : { kind: "current" };
};

// Live sessions. Stopping the daemon ends them. All worktrees share one
// daemon, so every live session counts, this worktree's too.
const findDaemonHolders = (claims: Claim[]) =>
  claims.filter((claim) => claim.classification === "live");

const staleDaemonError = (
  keys: string[],
  holders: Claim[],
  stopCommand: string
) =>
  new CliError({
    fix: `Wait until their owners are done, or close them with ${holders
      .map(
        (claim) =>
          `\`bunx agent-device close --session ${claim.owner.session}\``
      )
      .join(", ")}. Then run \`${stopCommand}\` and retry.`,
    message: "agent-device daemon runs without the iOS signing values",
    status: "agent_device_daemon_env_stale",
    why: `The shared daemon reads ${keys.join(" and ")} only at start. A command without them started it, so the iPhone runner would get agent-device's default team. Stopping it ends live sessions: ${holders
      .map(
        (claim) =>
          `${claim.owner.session} from ${claim.owner.workspace} (PID ${claim.owner.pid})`
      )
      .join(", ")}.`,
  });

export { checkDaemonEnv, findDaemonHolders, readPsEnv, staleDaemonError };
export type { DaemonEnvState };
