// `bun sitemap capture`: capture every state whose inputs changed since the
// committed sitemap.json, flags off and on, then write sitemap.json. Fresh
// states keep their committed result without a simulator. One stdout line
// per capture as it finishes.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { installFile } from "../cli/app-install.ts";
import { ensureDevice } from "../cli/device.ts";
import type { Device } from "../cli/device.ts";
import { exportBundle, patchApp } from "../cli/release-smoke.ts";
import { CACHE_DIR, CliError, note, readJson } from "../cli/shared.ts";
import { attempt } from "./attempt.ts";
import { blobOrigin, download, listBlobs, uploadAll } from "./blob.ts";
import type { RemoteBlob } from "./blob.ts";
import { createDriver } from "./device.ts";
import { CaptureError, PREVIEW } from "./driver.ts";
import type { Driver } from "./driver.ts";
import { OVERRIDABLE_FLAGS } from "./flags.ts";
import type { FeatureFlag } from "./flags.ts";
import {
  createInputHasher,
  readNativeFingerprint,
  readChangedFiles,
  readSource,
  sha256,
} from "./inputs.ts";
import type { Source } from "./inputs.ts";
import { passId, stateKey, variantsOf } from "./manifest.ts";
import type { Pass, ScreenSpec, StateSpec } from "./manifest.ts";
import { measureNoise } from "./noise.ts";
import { decodePng, downscale, encodePng, normalizeScreenshot } from "./png.ts";
import { runPreflight } from "./preflight.ts";
import { prepareAndroidApp } from "./android-app.ts";
import {
  createAndroidDriver,
  normalizeAndroidScreenshot,
  runAndroidPreflight,
} from "./device-android.ts";
import {
  ANDROID_PROFILE,
  CAPTURE_ENV,
  DEVICE_PROFILE,
  SITE_IMAGE_SCALE,
  variantId,
} from "./profile.ts";
import type { Platform, Variant } from "./profile.ts";
import {
  DATA_FILE,
  pairStates,
  passesOf,
  readSite,
  screenMeta,
  shownPngs,
  siteHeader,
  staleReason,
  writeSite,
} from "./site.ts";
import type {
  CachedCapture,
  FlaggedRegion,
  ScreenResult,
  StateResult,
  VariantResult,
} from "./site.ts";
import { SCREENS } from "./states.ts";
import { countNode, diffTrees } from "./tree.ts";
import type { TreeNode } from "./tree.ts";

/** Local cache root. Vercel Blob mirrors states/, png/, and small/. */
export const SITEMAP_DIR = path.join(CACHE_DIR, "sitemap");
/** `<input hash>.json`: PNG hash and tree of one capture. */
export const STATES_DIR = path.join(SITEMAP_DIR, "states");
/** `<png hash>.png`: full-size normalized screenshots, shared by states. */
export const PNG_DIR = path.join(SITEMAP_DIR, "png");
/** `<png hash>.png`: downscaled site images. */
export const SMALL_DIR = path.join(SITEMAP_DIR, "small");
/** Result and failure files of one commit. */
export const runDir = (sha: string) => path.join(SITEMAP_DIR, "runs", sha);

interface Summary {
  captured: number;
  cached: number;
  /** Recaptures within the noise budget; the cached PNG was kept. */
  noise: number;
  failed: number;
  nondeterministic: number;
}

const hostInfo = (platform: Platform) => ({
  arch: os.arch(),
  platform,
  runtime:
    platform === "ios"
      ? `${DEVICE_PROFILE.runtime.version} (${DEVICE_PROFILE.runtime.build})`
      : `${ANDROID_PROFILE.systemImage.package} r${ANDROID_PROFILE.systemImage.revision}`,
});

const readCached = (inputHash: string) =>
  readJson<CachedCapture>(path.join(STATES_DIR, `${inputHash}.json`));

/** Local cache entry, downloaded from Blob on a local miss. */
const loadCached = async (
  remote: Map<string, RemoteBlob> | null,
  inputHash: string
) => {
  const local = readCached(inputHash);
  const blob = remote?.get(`states/${inputHash}.json`);
  if (local || !blob) {
    return local;
  }
  await download(blob.url, path.join(STATES_DIR, `${inputHash}.json`));
  return readCached(inputHash);
};

/** Full-size PNG on disk, downloaded from Blob when missing. False: gone. */
const ensurePng = async (
  remote: Map<string, RemoteBlob> | null,
  pngHash: string
) => {
  const file = path.join(PNG_DIR, `${pngHash}.png`);
  const blob = remote?.get(`png/${pngHash}.png`);
  if (!fs.existsSync(file) && blob) {
    await download(blob.url, file);
  }
  return fs.existsSync(file);
};

/** Downscaled site image of a local full-size PNG. */
const smallImage = (pngHash: string) => {
  const file = path.join(SMALL_DIR, `${pngHash}.png`);
  if (!fs.existsSync(file)) {
    const full = fs.readFileSync(path.join(PNG_DIR, `${pngHash}.png`));
    fs.mkdirSync(SMALL_DIR, { recursive: true });
    fs.writeFileSync(
      file,
      encodePng(downscale(decodePng(full), SITE_IMAGE_SCALE))
    );
  }
  return file;
};

const short = (hash: string) => hash.slice(0, 12);

/** Copy the native shell and swap in the capture JS. Reused per source tree and shell. */
const prepareApp = async (
  source: Source,
  shellFile: string,
  fingerprint: string
) => {
  const dir = path.join(
    SITEMAP_DIR,
    "apps",
    `${source.sha.slice(0, 12)}-${source.tree.slice(0, 8)}-${fingerprint.slice(0, 8)}-${sha256(shellFile).slice(0, 8)}`
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

const failureDir = (context: Context, key: string, pass: Pass) =>
  path.join(
    runDir(context.source.sha),
    "failures",
    `${key.replace("/", "__")}__${variantId(context.variant)}__${passId(pass).replaceAll(/[^a-z0-9+:-]/gu, "_")}`
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

interface Context {
  source: Source;
  driver: Driver;
  /** Variant the driver shows now. */
  variant: Variant;
  /** Screenshot bytes to normalized PNG bytes and hash, per platform. */
  normalize: (bytes: Buffer) => { bytes: Buffer; hash: string };
  hash: ReturnType<typeof createInputHasher>;
  /** Input hashes to capture again even when cached. */
  verify: Set<string>;
  summary: Summary;
  tmpFile: string;
  /** First nondeterministic capture. The run fails with it at the end. */
  nondeterministic: CliError | null;
  /** Every input hash this run looked up, attribution passes included. */
  used: Set<string>;
  /** Blob listing at run start. */
  remote: Map<string, RemoteBlob>;
}

/**
 * Write a fresh capture to the cache. A recapture of a cached input keeps
 * the cached bytes within the noise budget and throws `nondeterministic`
 * beyond it.
 */
const storeCapture = (
  context: Context,
  capture: {
    label: string;
    key: string;
    pass: Pass;
    inputHash: string;
    cached: CachedCapture | null;
    bytes: Buffer;
    tree: TreeNode[];
    ms: number;
  }
): CachedCapture => {
  const { summary } = context;
  const { label, key, pass, inputHash, cached, tree, ms } = capture;
  const normalized = context.normalize(capture.bytes);
  if (cached && cached.pngHash !== normalized.hash) {
    const noise = measureNoise(
      fs.readFileSync(path.join(PNG_DIR, `${cached.pngHash}.png`)),
      normalized.bytes
    );
    if (noise.isWithinBudget) {
      // Cached bytes stay canonical: output never changes on a rerun.
      summary.noise += 1;
      process.stdout.write(
        `noise    ${label.padEnd(44)} in=${short(inputHash)} png=${short(cached.pngHash)} kept, new differs by ${noise.maxDelta} levels in ${noise.pixels} px\n`
      );
      return cached;
    }
    summary.nondeterministic += 1;
    const dir = failureDir(context, key, pass);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "new.png"), normalized.bytes);
    fs.copyFileSync(
      path.join(PNG_DIR, `${cached.pngHash}.png`),
      path.join(dir, "cached.png")
    );
    throw new CliError({
      status: "nondeterministic",
      message: `${label}: same inputs, new pixels`,
      why: `Input ${short(inputHash)} gave png ${short(cached.pngHash)} before and ${short(normalized.hash)} now, ${noise.maxDelta} levels in ${noise.pixels} px, over the noise budget. Compare ${dir}/cached.png and new.png.`,
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
    host: hostInfo(context.variant.platform),
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
};

/** Capture one state in one pass, or reuse the cache. Prints one line. */
const captureOne = async (
  context: Context,
  screen: ScreenSpec,
  state: StateSpec,
  pass: Pass
): Promise<CachedCapture> => {
  const { driver, summary } = context;
  const key = stateKey(screen, state);
  const inputHash = context.hash(screen, state, pass, context.variant);
  context.used.add(inputHash);
  const label = `${key} ${variantId(context.variant)} ${passId(pass)}`;
  const started = Date.now();
  let cached = await loadCached(context.remote, inputHash);
  if (cached && !context.verify.has(inputHash)) {
    summary.cached += 1;
    process.stdout.write(
      `cached   ${label.padEnd(44)} in=${short(inputHash)} png=${short(cached.pngHash)} ${Date.now() - started}ms\n`
    );
    return cached;
  }
  if (cached && !(await ensurePng(context.remote, cached.pngHash))) {
    // Pruned PNG: nothing to compare with, so capture as new.
    cached = null;
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
      return storeCapture(context, {
        label,
        key,
        pass,
        inputHash,
        cached,
        bytes,
        tree,
        ms: Date.now() - started,
      });
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
    failureDir(context, key, pass),
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
  // Verify: each element must appear with exactly its flags on. Elements
  // that only moved into view, like calendar days after a layout change,
  // fail here and are dropped instead of guessed.
  const verified: FlaggedRegion[] = [];
  for (const node of nodes) {
    const flags = found.get(node.index) ?? candidates;
    // oxlint-disable-next-line no-await-in-loop -- one simulator; cached when bisection captured the set
    const check = await captureOne(context, screen, state, {
      kind: "set",
      flags,
    });
    if (isAdded(check.tree, node)) {
      verified.push({ id: node.id, label: node.label, rect: node.rect, flags });
    } else {
      process.stdout.write(
        `dropped  ${stateKey(screen, state)} "${node.label || node.id}": not added by ${flags.join("+")} alone\n`
      );
    }
  }
  return verified;
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

/** Pick `count` cached states to capture again, the same ones for the same hashes. */
const pickVerify = async (
  remote: Map<string, RemoteBlob> | null,
  hashes: string[],
  count: number
) => {
  const cached = [];
  for (const hash of hashes) {
    // oxlint-disable-next-line no-await-in-loop -- small JSON files, in order
    if (await loadCached(remote, hash)) {
      cached.push(hash);
    }
  }
  return new Set(
    cached
      .toSorted((a, b) => sha256(a).localeCompare(sha256(b)))
      .slice(0, count)
  );
};

/**
 * Upload what the run used and Blob lacks: cache entries, full PNGs, and
 * site images of the shown PNGs. Runs before failures throw, so a failed
 * run still shares its captures.
 */
const syncUp = async (
  context: Pick<Context, "remote" | "used">,
  results: ScreenResult[]
) => {
  const files: { pathname: string; file: string }[] = [];
  for (const inputHash of context.used) {
    const entry = readCached(inputHash);
    if (entry && fs.existsSync(path.join(PNG_DIR, `${entry.pngHash}.png`))) {
      files.push(
        {
          pathname: `states/${inputHash}.json`,
          file: path.join(STATES_DIR, `${inputHash}.json`),
        },
        {
          pathname: `png/${entry.pngHash}.png`,
          file: path.join(PNG_DIR, `${entry.pngHash}.png`),
        }
      );
    }
  }
  for (const pngHash of shownPngs(results)) {
    if (
      !context.remote.has(`small/${pngHash}.png`) &&
      // oxlint-disable-next-line no-await-in-loop -- downloads only after Blob lost a site image
      (await ensurePng(context.remote, pngHash))
    ) {
      files.push({
        pathname: `small/${pngHash}.png`,
        file: smallImage(pngHash),
      });
    }
  }
  await uploadAll(files, context.remote);
};

/** Capture one pass; a failure lands in `result.errors` instead of throwing. */
const runPass = async (
  context: Context,
  screen: ScreenSpec,
  state: StateSpec,
  pass: Pass,
  result: VariantResult
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

/**
 * Main passes of one state in the context's variant. Light variants also
 * attribute what the on pass adds; dark shows the same elements.
 */
const captureState = async (
  context: Context,
  screen: ScreenSpec,
  state: StateSpec
): Promise<{ result: VariantResult; flagged: FlaggedRegion[] | null }> => {
  const result: VariantResult = { off: null, on: null, errors: {} };
  const passes = passesOf(screen);
  const off = passes.some((pass) => pass.kind === "off")
    ? await runPass(context, screen, state, { kind: "off" }, result)
    : null;
  const on = passes.some((pass) => pass.kind === "on")
    ? await runPass(context, screen, state, { kind: "on" }, result)
    : null;
  result.off = off && { inputHash: off.inputHash, pngHash: off.pngHash };
  result.on = on && { inputHash: on.inputHash, pngHash: on.pngHash };
  if (context.variant.appearance !== "light") {
    return { result, flagged: null };
  }
  const added = off && on ? diffTrees(off.tree, on.tree) : [];
  if (!off || added.length === 0) {
    return { result, flagged: [] };
  }
  try {
    const flagged = await attribute(
      context,
      screen,
      state,
      off.tree,
      added,
      OVERRIDABLE_FLAGS
    );
    return { result, flagged };
  } catch (error) {
    // SAFETY: captureOne wraps every failure in a CliError.
    const failure = error as CliError;
    result.errors.attribution = `${failure.status}: ${failure.message}`;
    return { result, flagged: [] };
  }
};

const regionKey = (region: FlaggedRegion) =>
  `${region.id}|${region.label}|${region.rect.join(",")}`;

/**
 * A sheet shows the screens below it. Flagged UI of an ancestor at the
 * same place belongs to that ancestor, not to the sheet.
 */
const dropInheritedRegions = (results: ScreenResult[]) => {
  const byId = new Map(results.map((screen) => [screen.id, screen]));
  for (const platform of ["ios", "android"] as const) {
    for (const screen of results) {
      const inherited = new Set<string>();
      let parent = screen.parent ? byId.get(screen.parent) : undefined;
      while (parent) {
        for (const state of parent.states) {
          for (const region of state.flagged[platform] ?? []) {
            inherited.add(regionKey(region));
          }
        }
        parent = parent.parent ? byId.get(parent.parent) : undefined;
      }
      for (const state of screen.states) {
        const regions = state.flagged[platform];
        if (regions) {
          state.flagged[platform] = regions.filter(
            (region) => !inherited.has(regionKey(region))
          );
        }
      }
    }
  }
};

interface Plan {
  screen: ScreenSpec;
  state: StateSpec;
  variant: Variant;
  /** Committed result of the whole state, all variants. */
  result: StateResult | undefined;
  /** Null: fresh, reuse the committed variant result. */
  reason: string | null;
}

/**
 * Which state variants to capture: stale ones, and with --only and
 * --platform, only those. Stale: inputs changed since sitemap.json, or Blob
 * lost an image.
 */
const planStates = (
  hash: ReturnType<typeof createInputHasher>,
  remote: Map<string, RemoteBlob>,
  values: Record<string, string | undefined>
): Plan[] => {
  const selected = new Set(
    selectScreens(values.only).flatMap((screen) =>
      screen.states.map((state) => stateKey(screen, state))
    )
  );
  const changed = readChangedFiles();
  return pairStates(readSite()).flatMap(({ screen, state, result }) =>
    variantsOf(screen).map((variant) => {
      let reason = staleReason(hash, screen, state, variant, result, changed);
      const committed = result?.variants[variantId(variant)];
      if (!reason && committed) {
        const lost = [committed.off?.pngHash, committed.on?.pngHash].filter(
          (png): png is string =>
            png !== undefined && !remote.has(`small/${png}.png`)
        );
        if (lost.length > 0) {
          reason = `image ${short(lost[0])} missing in Blob`;
        }
      }
      const isSelected =
        selected.has(stateKey(screen, state)) &&
        (!values.platform || values.platform === variant.platform);
      return {
        screen,
        state,
        variant,
        result,
        reason: isSelected ? reason : null,
      };
    })
  );
};

/**
 * State results keyed by state: committed variants that stay fresh, and
 * committed flagged regions. Captured variants replace entries later.
 */
const seedResults = (plan: Plan[]) => {
  const results = new Map<string, StateResult>();
  for (const { screen, state, variant, result, reason } of plan) {
    const key = stateKey(screen, state);
    const target = results.get(key) ?? {
      id: state.id,
      title: state.title,
      route: screen.route,
      variants: {},
      flagged: { ...result?.flagged },
    };
    results.set(key, target);
    const committed = result?.variants[variantId(variant)];
    if (reason === null && committed) {
      target.variants[variantId(variant)] = committed;
    }
  }
  return results;
};

/** Every screen of states.ts, states in manifest order. */
const assemble = (results: Map<string, StateResult>): ScreenResult[] =>
  SCREENS.map((screen) => ({
    ...screenMeta(screen),
    states: screen.states.map(
      (state) =>
        results.get(stateKey(screen, state)) ?? {
          id: state.id,
          title: state.title,
          route: screen.route,
          variants: {},
          flagged: {},
        }
    ),
  }));

/** Driver, normalizer, and device of one platform, ready to capture. */
const startPlatform = async (
  platform: Platform,
  source: Source,
  fingerprint: string,
  allowMismatch: boolean
) => {
  if (platform === "android") {
    runAndroidPreflight();
    const apk = await prepareAndroidApp(
      source,
      fingerprint,
      path.join(SITEMAP_DIR, "apps")
    );
    const driver = await createAndroidDriver(apk);
    return {
      driver,
      normalize: normalizeAndroidScreenshot,
      nativeFingerprint: fingerprint,
      isNativeMatch: true,
    };
  }
  const preflight = runPreflight({ allowMismatch, fingerprint });
  if (!preflight.shell) {
    throw new CliError({
      status: "release_build_missing",
      message: "No cached iOS Release simulator build",
      why: "Capture needs a Release build as native shell.",
      fix: "Run `bun app build --platform=ios`, then retry.",
    });
  }
  // The shell's own fingerprint, not the checkout's: with
  // --allow-native-mismatch they differ, and the pixels come from the shell.
  const nativeFingerprint = preflight.shell.fingerprint;
  const app = await prepareApp(source, preflight.shell.file, nativeFingerprint);
  const device = await ensureDevice("ios", { slim: false });
  assertDeviceRuntime(device);
  execFileSync("xcrun", ["simctl", "uninstall", device.id, PREVIEW.appId], {
    stdio: "ignore",
  });
  installFile(device, app.app, "preview");
  const driver = createDriver(device, app.executable);
  return {
    driver,
    normalize: normalizeScreenshot,
    nativeFingerprint,
    isNativeMatch: preflight.isNativeMatch,
  };
};

/**
 * `bun sitemap capture`: plan, then capture stale state variants per
 * platform and appearance, upload to Blob, write sitemap.json. Fails at the
 * end on any failure.
 */
export const captureFor = async (
  values: Record<string, string | undefined>
) => {
  const runStarted = Date.now();
  const allowMismatch = values["allow-native-mismatch"] !== undefined;
  const remote = await listBlobs();
  note(`Blob: ${remote.size} files`);
  const source = readSource();
  const fingerprint = await readNativeFingerprint();
  const checkoutHash = createInputHasher({
    source,
    nativeFingerprint: fingerprint,
  });
  const plan = planStates(checkoutHash, remote, values);
  const verifyCount = Number(values.verify ?? 0);
  for (const item of plan.filter((entry) => entry.reason !== null)) {
    process.stdout.write(
      `stale    ${`${stateKey(item.screen, item.state)} ${variantId(item.variant)}`.padEnd(44)} ${item.reason}\n`
    );
  }
  const results = seedResults(plan);
  const site = (screens: ScreenResult[]) =>
    writeSite({
      ...siteHeader(fingerprint),
      imageBase: blobOrigin(remote),
      screens,
    });
  const todo = plan.filter((item) => item.reason !== null);
  if (todo.length === 0 && verifyCount === 0) {
    site(assemble(results));
    process.stdout.write(
      `summary  fresh=${plan.length} captured=0 ${Math.round((Date.now() - runStarted) / 1000)}s\n` +
        `site     ${DATA_FILE}\n`
    );
    return;
  }
  const summary: Summary = {
    captured: 0,
    cached: 0,
    noise: 0,
    failed: 0,
    nondeterministic: 0,
  };
  let nondeterministic: CliError | null = null;
  const used = new Set<string>();
  let isNativeMatch = true;
  const platforms = (["ios", "android"] as const).filter((platform) =>
    plan.some(
      (item) =>
        item.variant.platform === platform &&
        (item.reason !== null || verifyCount > 0) &&
        (!values.platform || values.platform === platform)
    )
  );
  for (const platform of platforms) {
    // oxlint-disable-next-line no-await-in-loop -- one device at a time; RAM
    const started = await startPlatform(
      platform,
      source,
      fingerprint,
      allowMismatch
    );
    isNativeMatch &&= started.isNativeMatch;
    const hash = createInputHasher({
      source,
      nativeFingerprint: started.nativeFingerprint,
    });
    const items = plan.filter((item) => item.variant.platform === platform);
    // oxlint-disable-next-line no-await-in-loop -- one device at a time
    const verify = await pickVerify(
      remote,
      items
        .filter((item) => item.reason === null)
        .flatMap(({ screen, state, variant }) =>
          passesOf(screen).map((pass) => hash(screen, state, pass, variant))
        ),
      verifyCount
    );
    started.driver.prepare();
    try {
      for (const appearance of ["light", "dark"] as const) {
        const variant = { platform, appearance };
        const recapture = items.filter(
          (item) =>
            variantId(item.variant) === variantId(variant) &&
            (item.reason !== null ||
              passesOf(item.screen).some((pass) =>
                verify.has(hash(item.screen, item.state, pass, variant))
              ))
        );
        if (recapture.length === 0) {
          continue;
        }
        started.driver.setAppearance(appearance);
        const context: Context = {
          source,
          driver: started.driver,
          variant,
          normalize: started.normalize,
          hash,
          verify,
          summary,
          nondeterministic: null,
          used,
          remote,
          tmpFile: path.join(
            os.tmpdir(),
            `pixy-mood-tracker-sitemap-${process.pid}.png`
          ),
        };
        for (const { screen, state } of recapture) {
          // oxlint-disable-next-line no-await-in-loop -- one device, captures run in order
          const captured = await captureState(context, screen, state);
          // SAFETY: results has every key of the plan.
          const target = results.get(stateKey(screen, state)) as StateResult;
          target.variants[variantId(variant)] = captured.result;
          if (captured.flagged) {
            target.flagged[platform] = captured.flagged;
          }
        }
        nondeterministic ??= context.nondeterministic;
        fs.rmSync(context.tmpFile, { force: true });
      }
    } finally {
      started.driver.restore();
    }
  }
  const screens = assemble(results);
  dropInheritedRegions(screens);
  // sitemap.json is written even when an upload fails: `bun sitemap check`
  // names missing images, and the next capture uploads them.
  let uploaded: CliError | null = null;
  try {
    await syncUp({ remote, used }, screens);
  } catch (error) {
    // SAFETY: uploadAll wraps every failure in a CliError.
    uploaded = error as CliError;
  }
  process.stdout.write(
    `summary  fresh=${plan.length - todo.length} captured=${summary.captured} cached=${summary.cached} noise=${summary.noise} failed=${summary.failed} nondeterministic=${summary.nondeterministic} ${Math.round((Date.now() - runStarted) / 1000)}s\n`
  );
  if (isNativeMatch) {
    site(screens);
    process.stdout.write(`site     ${DATA_FILE}\n`);
  } else {
    note("Native shell does not match the checkout: sitemap.json not written");
  }
  if (uploaded) {
    throw uploaded;
  }
  if (nondeterministic) {
    throw nondeterministic;
  }
  if (summary.failed > 0) {
    throw new CliError({
      status: "capture_failed",
      message: `${summary.failed} capture(s) failed`,
      why: "See the fail lines above. Each names the wait condition and the saved files. sitemap.json records them, so `bun sitemap check` fails.",
      fix: "Fix each failure, then rerun. Fresh states are skipped.",
    });
  }
};
