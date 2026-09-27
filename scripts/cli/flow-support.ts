// Maestro steps that agent-device cannot run on phones. Fixture links on
// iPhones are seeded by e2e.ts. Other unsupported steps fail before a run.
import fs from "node:fs";
import path from "node:path";

import { YAML } from "bun";
import { z } from "zod";

import { CliError } from "./shared.ts";
import type { Platform } from "./shared.ts";

// One Maestro step, decoded to the fields this check reads.
interface Step {
  name: string;
  // Path or URL of `runFlow: <file>`, `openLink: <url>`, and similar.
  target?: string;
  clearState?: boolean;
  env?: { FIXTURE?: string };
  platform?: string;
  steps: Step[];
}

const firstEntry = <T>(step: Record<string, T>) => {
  const [name = "", value] = Object.entries(step)[0] ?? [];
  return { name, value };
};

const stepSchema: z.ZodType<Step> = z.lazy(() =>
  z.union([
    z.string().transform((name) => ({ name, steps: [] })),
    z.record(z.string(), z.string()).transform((step) => {
      const { name, value } = firstEntry(step);
      return { name, steps: [], target: value };
    }),
    z
      .record(
        z.string(),
        z.looseObject({
          clearState: z.boolean().optional(),
          env: z.looseObject({ FIXTURE: z.string().optional() }).optional(),
          file: z.string().optional(),
          when: z.looseObject({ platform: z.string().optional() }).optional(),
          commands: z.array(stepSchema).optional(),
        })
      )
      .transform((step) => {
        const { name, value } = firstEntry(step);
        return {
          name,
          clearState: value?.clearState,
          env: value?.env,
          platform: value?.when?.platform,
          steps: value?.commands ?? [],
          target: value?.file,
        };
      }),
    z
      .record(z.string(), z.unknown())
      .transform((step) => ({ name: firstEntry(step).name, steps: [] })),
  ])
);

// A flow file holds a header document and a step list. Subflows may hold
// the step list only.
const flowSchema = z.union([
  z.tuple([z.unknown(), z.array(stepSchema)]).transform(([, steps]) => steps),
  z.array(stepSchema),
]);

const IPHONE_LINK_ISSUE =
  "https://github.com/callstack/agent-device/issues/2998";
const ANDROID_TEXT_ISSUE =
  "https://github.com/callstack/agent-device/issues/2997";
const FIXTURE_SUBFLOW = "load-fixture.yaml";

// `bun e2e run` seeds the fixture itself on iPhones, so the link in this
// subflow does not need to work there.
const isFixtureStep = (step: Step) =>
  step.name === "runFlow" &&
  step.target !== undefined &&
  path.basename(step.target) === FIXTURE_SUBFLOW &&
  step.env?.FIXTURE !== undefined;

/** Why a phone cannot run one Maestro step, or null when it can. */
const findLimit = (platform: Platform, step: Step) => {
  if (platform === "android") {
    return step.name === "eraseText"
      ? `eraseText needs the agent-device test keyboard, which flow runs cannot enable on Android phones (${ANDROID_TEXT_ISSUE})`
      : null;
  }
  if (step.name === "openLink") {
    return `openLink never reaches the app on iPhones (${IPHONE_LINK_ISSUE})`;
  }
  const isClearState =
    step.name === "clearState" ||
    (step.name === "launchApp" && step.clearState === true);
  return isClearState
    ? "clearState works on iOS simulators only in agent-device"
    : null;
};

const readSteps = (file: string) => {
  const unreadable = (why: string) =>
    new CliError({
      exitCode: 2,
      status: "flow_unreadable",
      message: `Could not read flow ${file}`,
      why,
      fix: "Fix the YAML in this flow, then retry.",
    });
  let parsed: ReturnType<typeof YAML.parse>;
  try {
    parsed = YAML.parse(fs.readFileSync(file, "utf-8"));
  } catch (error) {
    throw unreadable(error instanceof Error ? error.message : String(error));
  }
  const result = flowSchema.safeParse(parsed);
  if (!result.success) {
    throw unreadable(z.prettifyError(result.error));
  }
  return result.data;
};

const collectLimits = (
  platform: Platform,
  file: string,
  steps: Step[],
  limits: Set<string>,
  seen: Set<string>
) => {
  for (const step of steps) {
    const limit = findLimit(platform, step);
    if (limit) {
      limits.add(limit);
    }
    if (step.platform && step.platform.toLowerCase() !== platform) {
      continue;
    }
    collectLimits(platform, file, step.steps, limits, seen);
    if (
      step.name === "runFlow" &&
      step.target &&
      !(platform === "ios" && isFixtureStep(step))
    ) {
      const subflow = path.resolve(path.dirname(file), step.target);
      if (!seen.has(subflow)) {
        seen.add(subflow);
        collectLimits(platform, subflow, readSteps(subflow), limits, seen);
      }
    }
  }
};

/** Expand selected flow files and folders in run order. */
export const listFlows = (root: string, paths: string[]) =>
  paths.flatMap((item) => {
    const absolute = path.resolve(root, item);
    return fs.statSync(absolute).isDirectory()
      ? fs
          .readdirSync(absolute)
          .filter((name) => /\.ya?ml$/u.test(name))
          .toSorted()
          .map((name) => path.join(item, name))
      : [item];
  });

/** Fixture ID a flow loads through load-fixture.yaml, or null. */
export const findFixture = (root: string, flow: string) => {
  const step = readSteps(path.resolve(root, flow)).find(isFixtureStep);
  return step?.env?.FIXTURE ?? null;
};

/** Blocked flows of one phone, each with the reasons agent-device cannot run it. */
export const findBlockedFlows = (
  root: string,
  platform: Platform,
  paths: string[]
) => {
  const flows = listFlows(root, paths);
  const blocked = flows.flatMap((flow) => {
    const file = path.resolve(root, flow);
    const limits = new Set<string>();
    collectLimits(platform, file, readSteps(file), limits, new Set([file]));
    return limits.size ? [{ flow, reasons: [...limits] }] : [];
  });
  return { blocked, flows };
};

const groupByReason = (blocked: { flow: string; reasons: string[] }[]) => {
  const groups = new Map<string, string[]>();
  for (const { flow, reasons } of blocked) {
    for (const reason of reasons) {
      groups.set(reason, [...(groups.get(reason) ?? []), flow]);
    }
  }
  return [...groups];
};

/** Fails before a phone run when a selected flow uses a step the phone cannot run. */
export const assertFlowsSupported = (
  root: string,
  device: { platform: Platform; key: string },
  paths: string[]
) => {
  const { blocked, flows } = findBlockedFlows(root, device.platform, paths);
  if (!blocked.length) {
    return;
  }
  const names = new Set(blocked.map(({ flow }) => flow));
  const runnable = flows.filter((flow) => !names.has(flow));
  const managed = device.platform === "ios" ? "simulator" : "emulator";
  throw new CliError({
    status: "flows_unsupported_on_phone",
    message: `${blocked.length} of ${flows.length} flows use steps agent-device cannot run on ${device.key}`,
    why: groupByReason(blocked)
      .map(
        ([reason, flowsOfReason]) => `${reason}: ${flowsOfReason.join(", ")}`
      )
      .join("; "),
    fix: [
      `Run them on the ${managed}: bun e2e run --platform=${device.platform} --paths=${[...names].join(",")}.`,
      runnable.length
        ? `Run the rest on the phone: bun e2e run --target=${device.key} --paths=${runnable.join(",")}.`
        : "No selected flow runs on this phone.",
    ].join(" "),
  });
};
