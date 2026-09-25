// `bun e2e`: run Maestro flows with agent-device, and list and stop runs
// across worktrees. Runs are the run.json files scripts/cli/e2e-reporter.mjs
// writes; see runs.ts.
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { AGENT_DEVICE, agentDevice } from "./agent-device.ts";
import type { Claim } from "./agent-device.ts";
import {
  ARTIFACTS_DIR,
  findRun,
  getStaleReason,
  isActive,
  isRunProcessAlive,
  markStopped,
  readRuns,
} from "./runs.ts";
import type { Run } from "./runs.ts";
import {
  CliError,
  PLATFORM_OPTION,
  defineCommand,
  formatAge,
  getPlatform,
  getWorktree,
  note,
  printTable,
} from "./shared.ts";
import type { Noun, Platform } from "./shared.ts";

const REPORTER = path.join(import.meta.dir, "e2e-reporter.mjs");

// iOS also runs the iOS-only regression flows.
const DEFAULT_PATHS: Record<Platform, string[]> = {
  android: ["e2e/flows"],
  ios: ["e2e/flows", "e2e/apple"],
};

const requirePlatform = (value: string | undefined) => {
  const platform = getPlatform(value);
  if (!platform) {
    throw new CliError({
      exitCode: 2,
      fix: "Pass --platform ios or --platform android.",
      message: "Missing --platform",
      status: "missing_platform",
      why: "agent-device needs the platform to find the device.",
    });
  }
  return platform;
};

// Resolves symlinks such as /tmp -> /private/tmp, so paths compare equal.
const realPath = (file: string) => {
  try {
    return fs.realpathSync(file);
  } catch {
    return file;
  }
};

// Who else uses the device: an active `bun e2e` run in any worktree, or a live
// agent-device session from another worktree. This worktree's own sessions
// do not count.
const findDeviceUser = async (device: string) => {
  const run = readRuns().find(
    (candidate) => isActive(candidate) && candidate.deviceId === device
  );
  if (run) {
    return {
      fix: `Stop it with \`bun e2e stop ${run.id}\``,
      why: `e2e run ${run.id} from ${path.basename(run.worktree)} (${run.branch}) started ${formatAge(run.startedAt)} ago.`,
    };
  }
  let claims: Claim[] = [];
  try {
    ({ claims } = await agentDevice<{ claims: Claim[] }>(["device", "status"]));
  } catch (error) {
    note(
      `warning: could not check who uses ${device}: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
  const worktree = realPath(getWorktree());
  const claim = claims.find(
    (candidate) =>
      candidate.classification === "live" &&
      candidate.device.id === device &&
      realPath(candidate.owner.workspace) !== worktree
  );
  return claim
    ? {
        fix: `Release it with \`bunx agent-device close --session ${claim.owner.session}\` once its owner is done`,
        why: `agent-device session ${claim.owner.session} from ${claim.owner.workspace} (PID ${claim.owner.pid}) holds it.`,
      }
    : null;
};

const assertDeviceFree = async (device: string) => {
  const user = await findDeviceUser(device);
  if (user) {
    throw new CliError({
      fix: `Pick a free device (\`bunx agent-device device status\` lists owners). ${user.fix}, or pass --force to run anyway.`,
      message: `${device} is busy`,
      status: "device_busy",
      why: user.why,
    });
  }
};

const cmdRun = async (
  paths: string[],
  options: {
    platform: Platform;
    device: string;
    isForce: boolean;
    isRecord: boolean;
    passthrough: string[];
  }
) => {
  if (!options.isForce) {
    await assertDeviceFree(options.device);
  }
  // The reporter reads --udid or --serial to record which device ran.
  const selector = options.platform === "ios" ? "--udid" : "--serial";
  const args = [
    "test",
    ...(paths.length > 0 ? paths : DEFAULT_PATHS[options.platform]),
    "--maestro",
    "--platform",
    options.platform,
    selector,
    options.device,
    "--artifacts-dir",
    ARTIFACTS_DIR,
    "--reporter",
    "default",
    "--reporter",
    REPORTER,
    ...(options.isRecord ? ["--record-video"] : []),
    ...options.passthrough,
  ];
  note(`Running: agent-device ${args.join(" ")}`);
  const child = spawn(AGENT_DEVICE, args, {
    cwd: getWorktree(),
    stdio: "inherit",
  });
  // Ctrl+C reaches agent-device through the shared process group; stay alive
  // until it wrote its final result.
  process.on("SIGINT", () =>
    note("Stopping: waiting for agent-device to write the result...")
  );
  try {
    // SAFETY: a ChildProcess "exit" event passes (code: number | null, signal).
    const [code] = (await once(child, "exit")) as [number | null];
    process.exitCode = code ?? 1;
  } catch (error) {
    throw new CliError({
      fix: "Run `bun install` to install the pinned agent-device.",
      message: "agent-device could not start",
      status: "agent_device_missing",
      why: error instanceof Error ? error.message : String(error),
    });
  }
};

const describeStatus = (run: Run) => {
  const stale = getStaleReason(run);
  return stale ? "stale" : run.status;
};

const describeFlows = (run: Run) => {
  const passed = run.flows.filter((flow) => flow.status === "passed").length;
  return `${passed}/${run.flows.length} passed`;
};

const cmdList = (isAll: boolean, isJson: boolean) => {
  const runs = readRuns().filter((run) => isAll || isActive(run));
  if (isJson) {
    console.log(
      JSON.stringify(
        runs.map((run) => ({ ...run, staleReason: getStaleReason(run) })),
        null,
        2
      )
    );
    return;
  }
  if (runs.length === 0) {
    note(isAll ? "No e2e runs." : "No running e2e runs. Try --all.");
    return;
  }
  printTable(
    ["ID", "STATUS", "OS", "DEVICE", "AGE", "WORKTREE", "FLOWS"],
    runs.map((run) => [
      run.id,
      describeStatus(run),
      run.platform ?? "-",
      run.deviceId ?? "-",
      formatAge(run.startedAt),
      `${path.basename(run.worktree)} (${run.branch})`,
      describeFlows(run),
    ])
  );
};

const STOP_TIMEOUT_MS = 30_000;

// Stops a run the same way Ctrl+C does, so agent-device releases the device.
const cmdStop = async (id: string) => {
  const run = findRun(id);
  if (!run || run.status !== "running" || !isRunProcessAlive(run)) {
    throw new CliError({
      fix: "Run `bun e2e list` to see running runs. Finished runs cannot be stopped.",
      message: `No running e2e run ${id}`,
      status: "run_not_running",
      why: run
        ? "The run finished or its agent-device process already exited."
        : "No worktree has a run with this ID in .agent-device/test-artifacts.",
    });
  }
  process.kill(run.pid, "SIGINT");
  note(`Stopping run ${id} on ${run.deviceId ?? "its device"}...`);
  const deadline = Date.now() + STOP_TIMEOUT_MS;
  while (isRunProcessAlive(run)) {
    if (Date.now() > deadline) {
      throw new CliError({
        fix: `Rerun \`bun e2e stop ${id}\`, or end process ${run.pid} with \`kill ${run.pid}\`.`,
        message: `Run ${id} did not stop`,
        status: "stop_timeout",
        why: `agent-device (PID ${run.pid}) still runs ${STOP_TIMEOUT_MS / 1000}s after SIGINT.`,
      });
    }
    // oxlint-disable-next-line no-await-in-loop -- polling must wait between checks
    await sleep(500);
  }
  markStopped(findRun(id) ?? run);
  console.log(`Stopped run ${id}`);
};

const E2E: Noun = {
  commands: {
    run: defineCommand({
      args: ["[paths...]"],
      details: `Runs Maestro flows through agent-device (default: e2e/flows, plus
e2e/apple on iOS). Paths replace the default.

--platform ios|android  Required.
--device <id>           Required. Simulator UDID or Android serial, so the run
                        never lands on another agent's device.
--record                Record every flow to recording.mp4.
--force                 Run even if another worktree's e2e run or agent-device
                        session uses the device.
-- <args>               Pass the rest to \`agent-device test\`,
                        e.g. -- --retries 1 --fail-fast.

Artifacts land in .agent-device/test-artifacts/<run-id>/ of this worktree.
Exits with agent-device's exit code.`,
      hasPassthrough: true,
      options: {
        ...PLATFORM_OPTION,
        device: { type: "string" },
        force: { type: "boolean" },
        record: { type: "boolean" },
      },
      run: async (paths, values, passthrough) => {
        const platform = requirePlatform(values.platform);
        if (!values.device) {
          throw new CliError({
            exitCode: 2,
            fix: "Find one with `bunx agent-device devices`, then pass --device <id>.",
            message: "Missing --device",
            status: "missing_device",
            why: "Without a device, agent-device may pick one another worktree is using.",
          });
        }
        await cmdRun(paths, {
          device: values.device,
          isForce: values.force ?? false,
          isRecord: values.record ?? false,
          passthrough,
          platform,
        });
      },
      summary: "Run e2e flows on a device",
    }),
    list: defineCommand({
      details: `--all    Include finished and stale runs.
--json   Print JSON instead of a table.

Lists runs from every worktree of this repo.`,
      options: { all: { type: "boolean" }, json: { type: "boolean" } },
      run: (_args, values) =>
        cmdList(values.all ?? false, values.json ?? false),
      summary: "List running e2e runs across worktrees",
    }),
    stop: defineCommand({
      args: ["<run-id>"],
      argsSource: "bun e2e list",
      details:
        "Sends SIGINT, like Ctrl+C, so agent-device releases the device and writes its result.",
      run: ([id]) => cmdStop(id),
      summary: "Stop a running e2e run",
    }),
  },
  footer: `Devices: \`bunx agent-device devices\`, \`boot\`, and \`shutdown\`. See e2e/README.md.`,
  summary: "Run e2e flows with agent-device and track runs across worktrees.",
};

/** `bun e2e` commands. */
export { E2E };
