// `bun e2e`: run Maestro flows with agent-device, and list and stop runs
// across worktrees. Runs are the run.json files scripts/cli/e2e-reporter.mjs
// writes; see runs.ts.
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { APP_VARIANTS, getAppVariant } from "../../app.config.ts";
import type { AppVariant } from "../../app.config.ts";
import {
  AGENT_DEVICE,
  agentDevice,
  findAgentDevice,
  getAgentDeviceEnv,
  listAgentDevices,
} from "./agent-device.ts";
import type { AgentDevice, Claim } from "./agent-device.ts";
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
  defineCommand,
  formatAge,
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

const requireVariant = (value = "preview") => {
  try {
    return getAppVariant(value);
  } catch {
    throw new CliError({
      exitCode: 2,
      fix: `Pass --variant ${Object.keys(APP_VARIANTS).join(", --variant ")}.`,
      message: "Unknown --variant",
      status: "invalid_variant",
      why: `--variant is "${value}".`,
    });
  }
};

// Resolves symlinks such as /tmp -> /private/tmp, so paths compare equal.
const realPath = (file: string) => {
  try {
    return fs.realpathSync(file);
  } catch {
    return file;
  }
};

// Median duration of passed runs on this platform, or null without history.
// Failed runs often stop early, so they would understate the wait.
const getTypicalDurationMs = (platform: Platform | null) => {
  const durations = readRuns()
    .filter(
      (run) =>
        run.status === "passed" &&
        run.finishedAt !== null &&
        run.platform === platform
    )
    .map((run) => Date.parse(run.finishedAt ?? "") - Date.parse(run.startedAt))
    .toSorted((a, b) => a - b);
  return durations.length > 0
    ? durations[Math.floor(durations.length / 2)]
    : null;
};

const formatDuration = (ms: number) =>
  ms < 90_000
    ? `${Math.max(1, Math.round(ms / 1000))}s`
    : `${Math.round(ms / 60_000)}m`;

// What an active run has done so far and when it should free the device.
const describeRunProgress = (run: Run) => {
  const done = run.flows.length;
  const failed = run.flows.filter((flow) => flow.status === "failed").length;
  const progress = `${done} flow(s) finished${failed > 0 ? `, ${failed} failed` : ""}`;
  const typical = getTypicalDurationMs(run.platform);
  if (typical === null) {
    return `${progress}. No passed ${run.platform ?? ""} runs yet, so no time estimate.`;
  }
  const remaining = typical - (Date.now() - Date.parse(run.startedAt));
  return remaining > 0
    ? `${progress}. passed ${run.platform} runs take ~${formatDuration(typical)}, so it should finish in ~${formatDuration(remaining)}.`
    : `${progress}. passed ${run.platform} runs take ~${formatDuration(typical)}, so it should finish soon.`;
};

// Devices and their agent-device owners. Either list is empty when
// agent-device fails; `errors` says why.
const readDeviceState = async () => {
  const [devicesResult, claimsResult] = await Promise.allSettled([
    agentDevice<{ devices: AgentDevice[] }>(["devices"]),
    agentDevice<{ claims: Claim[] }>(["device", "status"]),
  ]);
  const errors = [devicesResult, claimsResult].flatMap((result) =>
    result.status === "rejected"
      ? [
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
        ]
      : []
  );
  return {
    claims:
      claimsResult.status === "fulfilled" ? claimsResult.value.claims : null,
    devices:
      devicesResult.status === "fulfilled" ? devicesResult.value.devices : null,
    errors,
  };
};

// A live agent-device session from another worktree. This worktree's own
// sessions do not count.
const isForeignClaim = (claim: Claim, worktree: string) =>
  claim.classification === "live" &&
  realPath(claim.owner.workspace) !== worktree;

// Who else uses the device: an active `bun e2e` run in any worktree, or a live
// agent-device session from another worktree.
const findDeviceUser = (device: string, claims: Claim[] | null) => {
  const run = readRuns().find(
    (candidate) => isActive(candidate) && candidate.deviceId === device
  );
  if (run) {
    return {
      fix: `Stop it with \`bun e2e stop ${run.id}\``,
      wait: `Wait until run ${run.id} finishes (\`bun e2e list\` shows it)`,
      why: `e2e run ${run.id} from ${path.basename(run.worktree)} (${run.branch}) started ${formatAge(run.startedAt)} ago. ${describeRunProgress(run)}`,
    };
  }
  const worktree = realPath(getWorktree());
  const claim = claims?.find(
    (candidate) =>
      candidate.device.id === device && isForeignClaim(candidate, worktree)
  );
  return claim
    ? {
        fix: `Release it with \`bunx agent-device close --session ${claim.owner.session}\` once its owner is done`,
        wait: `Wait until the agent in ${path.basename(claim.owner.workspace)} is done with it`,
        why: `agent-device session ${claim.owner.session} from ${claim.owner.workspace} (PID ${claim.owner.pid}) holds it since ${formatAge(new Date(claim.owner.startTime).toISOString())} ago.`,
      }
    : null;
};

// Booted devices on the platform that no run or other worktree uses.
const listFreeDevices = (
  platform: Platform,
  busyDevice: string,
  devices: AgentDevice[],
  claims: Claim[]
) => {
  const worktree = realPath(getWorktree());
  const used = new Set([
    busyDevice,
    ...readRuns()
      .filter(isActive)
      .flatMap((run) => (run.deviceId ? [run.deviceId] : [])),
    ...claims
      .filter((claim) => isForeignClaim(claim, worktree))
      .map((claim) => claim.device.id),
  ]);
  return devices.filter(
    (device) =>
      device.platform === platform &&
      (device.booted || device.kind === "device") &&
      !used.has(device.id)
  );
};

const describeDevice = (device: AgentDevice) =>
  `${device.name} (${device.kind === "device" ? "physical" : device.kind})`;

// Other devices to use: free ones with a ready command, or how to boot one.
const describeAlternatives = (
  platform: Platform,
  busyDevice: string,
  state: Awaited<ReturnType<typeof readDeviceState>>
) => {
  if (!state.devices) {
    return [
      `List devices with \`bun devices list\` (listing failed: ${state.errors.join("; ")}).`,
    ];
  }
  const free = listFreeDevices(
    platform,
    busyDevice,
    state.devices,
    state.claims ?? []
  );
  if (free.length === 0) {
    const example = platform === "ios" ? '"iPhone 17 Pro"' : "medium_phone";
    return [
      `No other booted ${platform} device is free. Boot one: \`bunx agent-device boot --platform ${platform} --device ${example}\`.`,
    ];
  }
  const idWidth = Math.max(...free.map((device) => device.id.length));
  const labelWidth = Math.max(
    ...free.map((device) => describeDevice(device).length)
  );
  return [
    `Free ${platform} devices:`,
    ...free.map(
      (device) =>
        `    ${device.id.padEnd(idWidth)}  ${describeDevice(device).padEnd(labelWidth)}  -> bun e2e run --device ${device.id}`
    ),
  ];
};

const assertDeviceFree = async (platform: Platform, device: string) => {
  const state = await readDeviceState();
  if (!state.claims) {
    note(
      `warning: could not check agent-device owners of ${device}: ${state.errors.join("; ")}`
    );
  }
  const user = findDeviceUser(device, state.claims);
  if (user) {
    const name = state.devices?.find(({ id }) => id === device)?.name;
    throw new CliError({
      fix: [
        `${user.wait}, or use another device.`,
        ...describeAlternatives(platform, device, state),
        `Or: ${user.fix}, or pass --force to run anyway.`,
      ].join("\n       "),
      message: `${name ? `${name} (${device})` : device} is busy`,
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
    variant: AppVariant;
  }
) => {
  if (!options.isForce) {
    await assertDeviceFree(options.platform, options.device);
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
    // Flows target the installed variant through ${APP_ID} and ${APP_SCHEME}.
    "--env",
    `APP_ID=${APP_VARIANTS[options.variant].appId}`,
    "--env",
    `APP_SCHEME=${APP_VARIANTS[options.variant].scheme}`,
    ...(options.isRecord ? ["--record-video"] : []),
    ...options.passthrough,
  ];
  note(`Running: agent-device ${args.join(" ")}`);
  const child = spawn(AGENT_DEVICE, args, {
    cwd: getWorktree(),
    env: getAgentDeviceEnv(),
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
      details: `--device <id|name>  Required. ID or name from \`bun devices list\`.
                    Platform comes from the device.
--variant <name>    preview (default). e2e builds are preview builds.
--record            Record every flow to recording.mp4.
--force             Run even if another worktree uses the device.
-- <args>           Passed to \`agent-device test\`, e.g. -- --retries 1.

Runs Maestro flows (default: e2e/flows, plus e2e/apple on iOS). Paths replace
the default. Artifacts land in .agent-device/test-artifacts/<run-id>/ of this
worktree. Exits with agent-device's exit code.`,
      hasPassthrough: true,
      usage: "[paths...] [options] [-- <args>]",
      options: {
        device: { type: "string" },
        force: { type: "boolean" },
        record: { type: "boolean" },
        variant: { type: "string" },
      },
      run: async (paths, values, passthrough) => {
        if (!values.device) {
          throw new CliError({
            exitCode: 2,
            fix: "Find one with `bun devices list`, then pass --device <id|name>.",
            message: "Missing --device",
            status: "missing_device",
            why: "Without a device, agent-device may pick one another worktree is using.",
          });
        }
        const { device, platform } = findAgentDevice(
          await listAgentDevices(),
          values.device
        );
        await cmdRun(paths, {
          device: device.id,
          isForce: values.force ?? false,
          isRecord: values.record ?? false,
          passthrough,
          platform,
          variant: requireVariant(values.variant),
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
  footer: `Devices: \`bun devices list\`. Boot and shut down: \`bunx agent-device boot\`, \`shutdown\`. See e2e/README.md.`,
  summary: "Run e2e flows with agent-device and track runs across worktrees.",
};

/** `bun e2e` commands, plus device and flag checks `bun app` reuses. */
export { E2E, assertDeviceFree, requireVariant };
