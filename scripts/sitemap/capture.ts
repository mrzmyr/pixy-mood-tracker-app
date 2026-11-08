// `bun sitemap capture`: every state of states.ts, flags off and on, on a
// pinned commit. One stdout line per capture as it finishes.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { installFile } from "../cli/app-install.ts";
import { ensureDevice } from "../cli/device.ts";
import type { Device } from "../cli/device.ts";
import { exportBundle, patchApp } from "../cli/release-smoke.ts";
import { CACHE_DIR, CliError, note, readJson } from "../cli/shared.ts";
import { CaptureError, PREVIEW, createDriver } from "./device.ts";
import type { Driver } from "./device.ts";
import { OVERRIDABLE_FLAGS } from "./flags.ts";
import type { FeatureFlag } from "./flags.ts";
import { createInputHasher, pinSource, sha256 } from "./inputs.ts";
import type { Source } from "./inputs.ts";
import { passFlags, passId, stateKey } from "./manifest.ts";
import type { Pass, ScreenSpec, StateSpec, Step } from "./manifest.ts";
import { decodePng, hashPixels, normalizePng } from "./png.ts";
import { runPreflight } from "./preflight.ts";
import {
  CAPTURE_ENV,
  CLOCK_BUDGET_SECONDS,
  DEVICE_PROFILE,
} from "./profile.ts";
import { SCREENS } from "./states.ts";
import { countNode, diffTrees, normalizeTree } from "./tree.ts";
import type { RawNode, TreeNode } from "./tree.ts";

/** Cache root of the sitemap. CI restores states/ and png/ between runs. */
export const SITEMAP_DIR = path.join(CACHE_DIR, "sitemap");
/** `<input hash>.json`: PNG hash and tree of one capture. */
export const STATES_DIR = path.join(SITEMAP_DIR, "states");
/** `<png hash>.png`: full-size normalized screenshots, shared by states. */
export const PNG_DIR = path.join(SITEMAP_DIR, "png");
/** Result and failure files of one commit. */
export const runDir = (sha: string) => path.join(SITEMAP_DIR, "runs", sha);

/** Cache entry of one input hash. */
export interface CachedCapture {
  inputHash: string;
  pngHash: string;
  tree: TreeNode[];
  ms: number;
  host: { arch: string; runtime: string };
}

/** Flagged element in the flags-on screenshot, rect in points. */
export interface FlaggedRegion {
  id: string;
  label: string;
  rect: [number, number, number, number];
  /** Flags that add it. More than one: it needs them together. */
  flags: FeatureFlag[];
}

/** Hashes of one pass. The PNG lives at png/<pngHash>.png. */
export interface PassResult {
  inputHash: string;
  pngHash: string;
}

/** One state in result.json. A null pass was skipped or failed; see errors. */
export interface StateResult {
  id: string;
  title: string;
  route: string;
  off: PassResult | null;
  on: PassResult | null;
  flagged: FlaggedRegion[];
  /** Pass id to `status: message` of a failed capture. */
  errors: Record<string, string>;
}

/** One screen card in result.json. */
export interface ScreenResult {
  id: string;
  title: string;
  route: string;
  parent: string | null;
  isFlagOnly: boolean;
  requires: FeatureFlag[];
  hiddenBy: FeatureFlag[];
  states: StateResult[];
}

/** runs/<sha>/result.json: everything `bun sitemap build` reads. */
export interface RunResult {
  sha: string;
  subject: string;
  date: string;
  isDeployable: boolean;
  nativeFingerprint: string;
  profile: typeof DEVICE_PROFILE;
  screens: ScreenResult[];
  summary: Summary;
}

interface Summary {
  captured: number;
  cached: number;
  failed: number;
  nondeterministic: number;
}

const hostInfo = () => ({
  arch: os.arch(),
  runtime: `${DEVICE_PROFILE.runtime.version} (${DEVICE_PROFILE.runtime.build})`,
});

const readCached = (inputHash: string) =>
  readJson<CachedCapture>(path.join(STATES_DIR, `${inputHash}.json`));

const short = (hash: string) => hash.slice(0, 12);

/** Copy the native shell and swap in the capture JS. Reused per commit and shell. */
const prepareApp = async (
  source: Source,
  shellFile: string,
  fingerprint: string
) => {
  const dir = path.join(
    SITEMAP_DIR,
    "apps",
    `${source.sha.slice(0, 12)}-${fingerprint.slice(0, 8)}-${sha256(shellFile).slice(0, 8)}`
  );
  const marker = path.join(dir, "ready.json");
  const ready = readJson<{ app: string; executable: string }>(marker);
  if (ready && fs.existsSync(ready.app)) {
    note(`Capture app: reuse ${ready.app}`);
    return ready;
  }
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const started = Date.now();
  const exported = await exportBundle("preview", dir, CAPTURE_ENV);
  const patched = patchApp(shellFile, exported, dir);
  fs.rmSync(path.join(dir, "export"), { recursive: true, force: true });
  fs.rmSync(path.join(dir, "tmp"), { recursive: true, force: true });
  const result = { app: patched.app, executable: patched.executable };
  fs.writeFileSync(marker, `${JSON.stringify(result)}\n`);
  note(`Capture app: built in ${Math.round((Date.now() - started) / 1000)}s`);
  return result;
};

/** The checkout simulator must run the pinned runtime. */
const assertDeviceRuntime = (device: Device) => {
  // SAFETY: simctl list devices -j groups devices by runtime identifier.
  const { devices } = JSON.parse(
    execFileSync("xcrun", ["simctl", "list", "devices", "-j"], {
      encoding: "utf-8",
    })
  ) as {
    devices: Record<string, { udid: string; deviceTypeIdentifier?: string }[]>;
  };
  const wanted = `iOS-${DEVICE_PROFILE.runtime.version.replace(".", "-")}`;
  const entry = Object.entries(devices).find(([, list]) =>
    list.some((candidate) => candidate.udid === device.id)
  );
  const model = entry?.[1].find(
    (candidate) => candidate.udid === device.id
  )?.deviceTypeIdentifier;
  if (!entry?.[0].endsWith(wanted) || !model?.endsWith("iPhone-17-Pro")) {
    throw new CliError({
      status: "simulator_profile_mismatch",
      message: `Simulator ${device.name} is not ${DEVICE_PROFILE.model} on iOS ${DEVICE_PROFILE.runtime.version}`,
      why: `It runs ${entry?.[0] ?? "an unknown runtime"} as ${model ?? "an unknown model"}.`,
      fix: "Delete it with `bun builds prune` after closing its session, then retry. The CLI creates it again with the default runtime.",
    });
  }
};

const failureDir = (sha: string, key: string, pass: Pass) =>
  path.join(
    runDir(sha),
    "failures",
    `${key.replace("/", "__")}__${passId(pass).replaceAll(/[^a-z0-9+:-]/gu, "_")}`
  );

/** Screenshot, tree, and crash report of a failed capture. Never throws. */
const saveFailure = async (driver: Driver, dir: string, error: CliError) => {
  fs.mkdirSync(dir, { recursive: true });
  const files: string[] = [];
  const crash = driver.pid() === null ? driver.findCrashReport() : null;
  if (crash) {
    fs.copyFileSync(crash, path.join(dir, path.basename(crash)));
    files.push(path.join(dir, path.basename(crash)));
  }
  try {
    driver.screenshot(path.join(dir, "screen.png"));
    files.push(path.join(dir, "screen.png"));
  } catch {
    // App or simulator gone.
  }
  try {
    const nodes = await driver.snapshot();
    fs.writeFileSync(
      path.join(dir, "tree.json"),
      `${JSON.stringify(nodes, null, 1)}\n`
    );
    files.push(path.join(dir, "tree.json"));
  } catch {
    // No session.
  }
  fs.writeFileSync(
    path.join(dir, "error.json"),
    `${JSON.stringify({ status: error.status, message: error.message, why: error.why, fix: error.fix }, null, 2)}\n`
  );
  return { files, crash };
};

const trap = (
  status: string,
  message: string,
  why: string,
  fix: string,
  isRetryable = false
) => new CaptureError({ status, message, why, fix }, isRetryable);

const runStep = async (driver: Driver, step: Step) => {
  try {
    if ("press" in step) {
      await driver.press(step.press);
    } else if ("scroll" in step) {
      await driver.scroll(step.scroll, step.until);
    } else {
      await driver.waitFor(step.wait);
    }
  } catch (error) {
    throw trap(
      "step_failed",
      `Step ${JSON.stringify(step)} failed`,
      error instanceof Error ? error.message : String(error),
      "Check the selector in scripts/sitemap/states.ts against the saved tree.json."
    );
  }
};

/** Screenshots until two in a row have equal pixels. */
const settle = async (driver: Driver, file: string) => {
  let previous: string | null = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const bytes = driver.screenshot(file);
    const hash = hashPixels(decodePng(bytes));
    if (hash === previous) {
      return bytes;
    }
    previous = hash;
    // oxlint-disable-next-line no-await-in-loop -- wait for the next frame set
    await sleep(300);
  }
  throw trap(
    "settle_timeout",
    "Screen kept changing",
    "30 screenshots 300 ms apart all differed. An animation or timer runs.",
    "Stop the motion in capture builds (src/shell/sitemap-capture.tsx) or pick a still state."
  );
};

/** One attempt: launch, fixture, flags, route, steps, wait, screenshot, tree. */
const attempt = async (
  driver: Driver,
  screen: ScreenSpec,
  state: StateSpec,
  pass: Pass,
  tmpFile: string
) => {
  const flags = passFlags(screen, pass);
  await driver.launch();
  const started = await driver.pollProbes(
    (probes) => probes.route !== null,
    30_000
  );
  if (!started.isDone) {
    throw started.nodes.length <= 1
      ? trap(
          "a11y_empty",
          "Accessibility snapshot is empty after launch",
          "agent-device returned no app elements. The XCTest runner lost the app.",
          "Relaunch runs once. Still empty: `bunx agent-device daemon stop`, then retry.",
          true
        )
      : trap(
          "probe_missing",
          "Capture probes missing",
          "The app has no sitemap-route element. The installed app is not a capture build.",
          "Delete ~/.cache/pixy-mood-tracker/sitemap/apps, then retry."
        );
  }
  driver.openUrl(`${PREVIEW.scheme}://dev/fixture?id=${state.fixture}`);
  const loaded = await driver.pollProbes(
    (probes) =>
      probes.route !== null &&
      probes.route !== "/dev/fixture" &&
      probes.route !== "/",
    30_000
  );
  if (!loaded.isDone) {
    throw trap(
      "fixture_timeout",
      `Fixture ${state.fixture} did not load`,
      `Route stayed ${loaded.probes.route}.`,
      "Open the fixture link by hand and read tree.json."
    );
  }
  if (loaded.probes.filters !== "0") {
    throw trap(
      "filters_stale",
      "Calendar filters active after fixture load",
      `Filter probe says ${loaded.probes.filters} filters. Earlier state leaked into this launch.`,
      "Relaunch runs once. Still active: fix filter reset on fixture load.",
      true
    );
  }
  if (flags.length > 0) {
    driver.openUrl(
      `${PREVIEW.scheme}://dev/feature-flag?key=${flags.join(",")}&value=on`
    );
  }
  const expected = new Set(flags);
  const flagged = await driver.pollProbes(
    (probes) =>
      probes.route !== "/dev/feature-flag" &&
      OVERRIDABLE_FLAGS.every(
        (flag) => probes.flags.get(flag) === (expected.has(flag) ? "on" : "off")
      ),
    20_000
  );
  if (!flagged.isDone) {
    const wrong = OVERRIDABLE_FLAGS.filter(
      (flag) =>
        flagged.probes.flags.get(flag) !== (expected.has(flag) ? "on" : "off")
    );
    throw trap(
      "flags_wrong",
      `Flags not as expected after relaunch: ${wrong.join(", ")}`,
      `Expected on: ${flags.join(", ") || "none"}. Overrides end at app restart; the link must set them again.`,
      "Relaunch runs once. Still wrong: check DevFeatureFlagLinkScreen.",
      true
    );
  }
  const route = state.route ?? screen.route;
  const [pathname] = route.split("?");
  if (flagged.probes.route !== pathname) {
    driver.openPath(route);
    const routed = await driver.pollProbes(
      (probes) => probes.route === pathname,
      20_000
    );
    if (!routed.isDone) {
      throw trap(
        "route_timeout",
        `Route ${route} did not open`,
        `Route probe says ${routed.probes.route}.`,
        "Check the route in scripts/sitemap/states.ts and the screen's redirect logic."
      );
    }
  }
  for (const step of state.steps ?? []) {
    // oxlint-disable-next-line no-await-in-loop -- steps run in order
    await runStep(driver, step);
  }
  try {
    await driver.waitFor(state.wait);
  } catch (error) {
    throw trap(
      "wait_failed",
      `Wait condition ${state.wait} failed`,
      error instanceof Error ? error.message : String(error),
      "Compare the selector with the saved tree.json and screen.png."
    );
  }
  const alert = await driver.readAlert();
  if (alert) {
    throw trap(
      "system_alert",
      "System alert on screen",
      `Alert: ${alert}.`,
      "Find the code that asks for the permission and keep it out of this state, or grant it in device.ts prepare."
    );
  }
  const bytes = await settle(driver, tmpFile);
  const nodes: RawNode[] = await driver.snapshot();
  if (nodes.filter((node) => node.type !== "Application").length < 2) {
    throw trap(
      "a11y_empty",
      "Accessibility snapshot is empty",
      "Screenshot shows the app but the tree has no elements.",
      "Relaunch runs once. Still empty: `bunx agent-device daemon stop`, then retry.",
      true
    );
  }
  const seconds = driver.secondsSinceLaunch();
  if (seconds > CLOCK_BUDGET_SECONDS) {
    throw trap(
      "clock_budget_exceeded",
      `State took ${seconds.toFixed(0)}s from launch`,
      `The app clock started at 09:41:00. After ${CLOCK_BUDGET_SECONDS}s a minute can roll over and change pixels.`,
      "Relaunch runs once. Still slow: check load (`uptime`) or shorten the steps.",
      true
    );
  }
  return { bytes, tree: normalizeTree(nodes) };
};

interface Context {
  source: Source;
  driver: Driver;
  hash: ReturnType<typeof createInputHasher>;
  /** Input hashes to capture again even when cached. */
  verify: Set<string>;
  summary: Summary;
  tmpFile: string;
  /** First nondeterministic capture. The run fails with it at the end. */
  nondeterministic: CliError | null;
}

/** Capture one state in one pass, or reuse the cache. Prints one line. */
const captureOne = async (
  context: Context,
  screen: ScreenSpec,
  state: StateSpec,
  pass: Pass
): Promise<CachedCapture> => {
  const { driver, summary } = context;
  const key = stateKey(screen, state);
  const inputHash = context.hash(screen, state, pass);
  const label = `${key} ${passId(pass)}`;
  const started = Date.now();
  const cached = readCached(inputHash);
  if (cached && !context.verify.has(inputHash)) {
    summary.cached += 1;
    process.stdout.write(
      `cached   ${label.padEnd(44)} in=${short(inputHash)} png=${short(cached.pngHash)} ${Date.now() - started}ms\n`
    );
    return cached;
  }
  let lastError: CliError | null = null;
  for (let round = 1; round <= 2; round += 1) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- one retry after a relaunch trap
      const { bytes, tree } = await attempt(
        driver,
        screen,
        state,
        pass,
        context.tmpFile
      );
      const normalized = normalizePng(bytes);
      const ms = Date.now() - started;
      if (cached && cached.pngHash !== normalized.hash) {
        summary.nondeterministic += 1;
        const dir = failureDir(context.source.sha, key, pass);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "new.png"), normalized.bytes);
        fs.copyFileSync(
          path.join(PNG_DIR, `${cached.pngHash}.png`),
          path.join(dir, "cached.png")
        );
        throw new CliError({
          status: "nondeterministic",
          message: `${label}: same inputs, new pixels`,
          why: `Input ${short(inputHash)} gave png ${short(cached.pngHash)} before and ${short(normalized.hash)} now. Compare ${dir}/cached.png and new.png.`,
          fix: "Find the unpinned input (time, random, network, animation) and pin it in the capture build. Never delete the cache entry to hide it.",
        });
      }
      fs.mkdirSync(PNG_DIR, { recursive: true });
      fs.mkdirSync(STATES_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(PNG_DIR, `${normalized.hash}.png`),
        normalized.bytes
      );
      const entry: CachedCapture = {
        inputHash,
        pngHash: normalized.hash,
        tree,
        ms,
        host: hostInfo(),
      };
      fs.writeFileSync(
        path.join(STATES_DIR, `${inputHash}.json`),
        `${JSON.stringify(entry)}\n`
      );
      summary.captured += 1;
      process.stdout.write(
        `${cached ? "verified" : "captured"} ${label.padEnd(44)} in=${short(inputHash)} png=${short(normalized.hash)} ${ms}ms\n`
      );
      return entry;
    } catch (error) {
      if (error instanceof CliError && error.status === "nondeterministic") {
        throw error;
      }
      lastError =
        error instanceof CliError
          ? error
          : new CliError({
              status: "capture_failed",
              message: `${label} failed`,
              why: error instanceof Error ? error.message : String(error),
              fix: "Read the saved screen.png and tree.json, then retry.",
            });
      if (driver.pid() === null && lastError.status !== "app_crashed") {
        const crash = driver.findCrashReport();
        lastError = new CliError({
          status: "app_crashed",
          message: `App crashed during ${label}`,
          why: `${lastError.status}: ${lastError.message}. Crash report: ${crash ?? "none found in ~/Library/Logs/DiagnosticReports"}.`,
          fix: "Read the crash report and the saved screen, fix the crash, then retry.",
        });
      }
      const isRetryable = error instanceof CaptureError && error.isRetryable;
      if (round === 1 && isRetryable) {
        process.stdout.write(
          `retry    ${label.padEnd(44)} ${lastError.status}: relaunch\n`
        );
        continue;
      }
      break;
    }
  }
  // SAFETY: the loop sets lastError before every break.
  const failure = lastError as CliError;
  const saved = await saveFailure(
    driver,
    failureDir(context.source.sha, key, pass),
    failure
  );
  summary.failed += 1;
  process.stdout.write(
    `fail     ${label.padEnd(44)} in=${short(inputHash)} ${failure.status}: ${failure.message}\n` +
      `         why: ${failure.why}\n         fix: ${failure.fix}\n` +
      `         saved: ${saved.files.join(" ")}\n`
  );
  throw failure;
};

/**
 * Which flags add each flagged element: capture with half the candidate
 * flags on, keep elements that appear, recurse. Elements that appear only
 * with flags from both halves get the whole set.
 */
const attribute = async (
  context: Context,
  screen: ScreenSpec,
  state: StateSpec,
  offTree: TreeNode[],
  nodes: TreeNode[],
  candidates: FeatureFlag[]
) => {
  const found = new Map<number, FeatureFlag[]>();
  const isAdded = (tree: TreeNode[], node: TreeNode) =>
    countNode(tree, node) > countNode(offTree, node);
  const search = async (flags: FeatureFlag[], open: TreeNode[]) => {
    if (open.length === 0) {
      return;
    }
    if (flags.length === 1) {
      for (const node of open) {
        found.set(node.index, flags);
      }
      return;
    }
    const half = Math.ceil(flags.length / 2);
    const first = flags.slice(0, half);
    const second = flags.slice(half);
    const captureFirst = await captureOne(context, screen, state, {
      kind: "set",
      flags: first,
    });
    const treeFirst = captureFirst.tree;
    const inFirst = open.filter((node) => isAdded(treeFirst, node));
    await search(first, inFirst);
    const rest = open.filter((node) => !inFirst.includes(node));
    if (rest.length === 0) {
      return;
    }
    const captureSecond = await captureOne(context, screen, state, {
      kind: "set",
      flags: second,
    });
    const treeSecond = captureSecond.tree;
    const inSecond = rest.filter((node) => isAdded(treeSecond, node));
    await search(second, inSecond);
    for (const node of rest.filter(
      (candidate) => !inSecond.includes(candidate)
    )) {
      found.set(node.index, flags);
    }
  };
  await search(candidates, nodes);
  return nodes.map((node) => ({
    id: node.id,
    label: node.label,
    rect: node.rect,
    flags: found.get(node.index) ?? candidates,
  }));
};

const selectScreens = (only: string | undefined) => {
  if (!only) {
    return SCREENS;
  }
  const wanted = only.split(",");
  const selected = SCREENS.map((screen) => ({
    ...screen,
    states: screen.states.filter((state) =>
      wanted.some(
        (item) => item === screen.id || item === stateKey(screen, state)
      )
    ),
  })).filter((screen) => screen.states.length > 0);
  if (selected.length === 0) {
    throw new CliError({
      exitCode: 2,
      status: "unknown_state",
      message: `--only matches no state: ${only}`,
      why: "Values are screen ids or <screen>/<state> ids from scripts/sitemap/states.ts.",
      fix: `Use one of: ${SCREENS.map((screen) => screen.id).join(", ")}.`,
    });
  }
  return selected;
};

/** Main passes of a screen: off unless flag-only, on unless a flag hides it. */
const passesOf = (screen: ScreenSpec): Pass[] => [
  ...((screen.requires ?? []).length > 0 ? [] : [{ kind: "off" } as const]),
  ...((screen.hiddenBy ?? []).length > 0 ? [] : [{ kind: "on" } as const]),
];

/** Pick `count` cached states to capture again, the same ones for the same hashes. */
const pickVerify = (hashes: string[], count: number) =>
  new Set(
    hashes
      .filter((hash) => readCached(hash))
      .toSorted((a, b) => sha256(a).localeCompare(sha256(b)))
      .slice(0, count)
  );

/** Capture one pass; a failure lands in `result.errors` instead of throwing. */
const runPass = async (
  context: Context,
  screen: ScreenSpec,
  state: StateSpec,
  pass: Pass,
  result: StateResult
) => {
  try {
    return await captureOne(context, screen, state, pass);
  } catch (error) {
    // SAFETY: captureOne wraps every failure in a CliError.
    const failure = error as CliError;
    result.errors[passId(pass)] = `${failure.status}: ${failure.message}`;
    if (failure.status === "nondeterministic") {
      context.nondeterministic ??= failure;
    }
    return null;
  }
};

/** Main passes, then flag attribution of what the on pass adds. */
const captureState = async (
  context: Context,
  screen: ScreenSpec,
  state: StateSpec
): Promise<StateResult> => {
  const result: StateResult = {
    id: state.id,
    title: state.title,
    route: state.route ?? screen.route,
    off: null,
    on: null,
    flagged: [],
    errors: {},
  };
  const passes = passesOf(screen);
  const off = passes.some((pass) => pass.kind === "off")
    ? await runPass(context, screen, state, { kind: "off" }, result)
    : null;
  const on = passes.some((pass) => pass.kind === "on")
    ? await runPass(context, screen, state, { kind: "on" }, result)
    : null;
  result.off = off && { inputHash: off.inputHash, pngHash: off.pngHash };
  result.on = on && { inputHash: on.inputHash, pngHash: on.pngHash };
  const added = off && on ? diffTrees(off.tree, on.tree) : [];
  if (off && added.length > 0) {
    try {
      result.flagged = await attribute(
        context,
        screen,
        state,
        off.tree,
        added,
        screen.attribute ?? OVERRIDABLE_FLAGS
      );
    } catch (error) {
      // SAFETY: captureOne wraps every failure in a CliError.
      const failure = error as CliError;
      result.errors.attribution = `${failure.status}: ${failure.message}`;
    }
  }
  return result;
};

const captureScreen = async (
  context: Context,
  screen: ScreenSpec
): Promise<ScreenResult> => {
  const states: StateResult[] = [];
  for (const state of screen.states) {
    // oxlint-disable-next-line no-await-in-loop -- one simulator, captures run in order
    states.push(await captureState(context, screen, state));
  }
  return {
    id: screen.id,
    title: screen.title,
    route: screen.route,
    parent: screen.parent,
    isFlagOnly: (screen.requires ?? []).length > 0,
    requires: screen.requires ?? [],
    hiddenBy: screen.hiddenBy ?? [],
    states,
  };
};

/**
 * `bun sitemap capture`: pin, preflight, build the capture app, capture every
 * selected state, write result.json. Fails at the end on any failure.
 */
export const captureFor = async (
  values: Record<string, string | undefined>
) => {
  const runStarted = Date.now();
  const source = pinSource({ allowHead: values.ref === "head" });
  const preflight = await runPreflight({
    allowMismatch: values["allow-native-mismatch"] !== undefined,
    source,
  });
  if (!preflight.shell) {
    throw new CliError({
      status: "release_build_missing",
      message: "No cached iOS Release simulator build",
      why: "Capture needs a Release build as native shell.",
      fix: "Run `bun app build --platform=ios`, then retry.",
    });
  }
  const screens = selectScreens(values.only);
  const app = await prepareApp(
    source,
    preflight.shell.file,
    preflight.fingerprint
  );
  const device = await ensureDevice("ios", { slim: false });
  assertDeviceRuntime(device);
  execFileSync("xcrun", ["simctl", "uninstall", device.id, PREVIEW.appId], {
    stdio: "ignore",
  });
  installFile(device, app.app, "preview");
  const driver = createDriver(device, app.executable);
  driver.prepare();
  const hash = createInputHasher({
    source,
    nativeFingerprint: preflight.fingerprint,
  });
  const allHashes = screens.flatMap((screen) =>
    screen.states.flatMap((state) =>
      passesOf(screen).map((pass) => hash(screen, state, pass))
    )
  );
  const context: Context = {
    source,
    driver,
    hash,
    verify: pickVerify(allHashes, Number(values.verify ?? 0)),
    summary: { captured: 0, cached: 0, failed: 0, nondeterministic: 0 },
    nondeterministic: null,
    tmpFile: path.join(
      os.tmpdir(),
      `pixy-mood-tracker-sitemap-${process.pid}.png`
    ),
  };
  const results: ScreenResult[] = [];
  for (const screen of screens) {
    // oxlint-disable-next-line no-await-in-loop -- one simulator, captures run in order
    results.push(await captureScreen(context, screen));
  }
  const run: RunResult = {
    sha: source.sha,
    subject: source.subject,
    date: source.date,
    isDeployable:
      source.isDeployable && preflight.isNativeMatch && !values.only,
    nativeFingerprint: preflight.fingerprint,
    profile: DEVICE_PROFILE,
    screens: results,
    summary: context.summary,
  };
  fs.mkdirSync(runDir(source.sha), { recursive: true });
  const resultFile = path.join(runDir(source.sha), "result.json");
  fs.writeFileSync(resultFile, `${JSON.stringify(run, null, 1)}\n`);
  fs.rmSync(context.tmpFile, { force: true });
  const { captured, cached, failed } = context.summary;
  process.stdout.write(
    `summary  captured=${captured} cached=${cached} failed=${failed} nondeterministic=${context.summary.nondeterministic} deployable=${run.isDeployable} ${Math.round((Date.now() - runStarted) / 1000)}s\n` +
      `result   ${resultFile}\n`
  );
  if (context.nondeterministic) {
    throw context.nondeterministic;
  }
  if (failed > 0) {
    throw new CliError({
      status: "capture_failed",
      message: `${failed} capture(s) failed`,
      why: "See the fail lines above. Each names the wait condition and the saved files.",
      fix: "Fix each failure, then rerun. Cached states are skipped.",
    });
  }
  return run;
};
