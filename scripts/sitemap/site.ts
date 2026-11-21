// apps/sitemap/sitemap.json: committed with the code it shows. Vercel
// deploys apps/sitemap from main; images load from Vercel Blob.
// `bun sitemap check`: fail when sitemap.json does not match the checkout.
// `bun sitemap prune`: delete Blob files main no longer uses.
import fs from "node:fs";
import path from "node:path";

import { CliError, note, readJson } from "../cli/shared.ts";
import { deleteBlobs, listBlobs } from "./blob.ts";
import { FEATURE_FLAG_DETAILS } from "./flags.ts";
import type { FeatureFlag } from "./flags.ts";
import {
  REPO_ROOT,
  createInputHasher,
  readNativeFingerprint,
  readSource,
} from "./inputs.ts";
import { passId, stateKey } from "./manifest.ts";
import type { Pass, ScreenSpec, StateSpec } from "./manifest.ts";
import { DEVICE_PROFILE, SCHEMA_VERSION } from "./profile.ts";
import { SCREENS } from "./states.ts";
import type { TreeNode } from "./tree.ts";

/** Committed site data. Vercel serves apps/sitemap as is. */
export const DATA_FILE = path.join(REPO_ROOT, "apps/sitemap/sitemap.json");

/** Cache entry of one input hash: states/<input hash>.json. */
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

/** One state. A null pass was skipped or failed; see errors. */
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

/** One screen card. */
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

/** apps/sitemap/sitemap.json. Holds no commit data, so reruns do not churn it. */
export interface SiteData {
  schema: number;
  nativeFingerprint: string;
  profile: typeof DEVICE_PROFILE;
  flags: typeof FEATURE_FLAG_DETAILS;
  /** Blob origin; images are `<imageBase>/small/<png hash>.png`. */
  imageBase: string;
  screens: ScreenResult[];
}

/** Committed sitemap.json, or null before the first capture. */
export const readSite = () => readJson<SiteData>(DATA_FILE);

/** Stable key order and indent, so a rerun with fresh states writes the same bytes. */
export const writeSite = (data: SiteData) => {
  fs.writeFileSync(DATA_FILE, `${JSON.stringify(data, null, 1)}\n`);
};

/** Main passes of a screen: off unless flag-only, on unless a flag hides it. */
export const passesOf = (screen: ScreenSpec): Pass[] => [
  ...((screen.requires ?? []).length > 0 ? [] : [{ kind: "off" } as const]),
  ...((screen.hiddenBy ?? []).length > 0 ? [] : [{ kind: "on" } as const]),
];

/** Screen card without states, from states.ts. */
export const screenMeta = (screen: ScreenSpec) => ({
  id: screen.id,
  title: screen.title,
  route: screen.route,
  parent: screen.parent,
  isFlagOnly: (screen.requires ?? []).length > 0,
  requires: screen.requires ?? [],
  hiddenBy: screen.hiddenBy ?? [],
});

/** PNG hashes the site shows; the site loads `small/<hash>.png` for each. */
export const shownPngs = (screens: ScreenResult[]) =>
  new Set(
    screens.flatMap((screen) =>
      screen.states.flatMap((state) =>
        [state.off?.pngHash, state.on?.pngHash].filter((hash): hash is string =>
          Boolean(hash)
        )
      )
    )
  );

type Hasher = ReturnType<typeof createInputHasher>;

/**
 * Why a committed state does not show the checkout, or null when it does.
 * Fresh: same title and route, no errors, and every main pass has the
 * input hash the checkout gives.
 */
export const staleReason = (
  hash: Hasher,
  screen: ScreenSpec,
  state: StateSpec,
  result: StateResult | undefined
): string | null => {
  if (!result) {
    return "not captured";
  }
  const errors = Object.entries(result.errors);
  if (errors.length > 0) {
    return `failed ${errors.map(([pass, error]) => `${pass}: ${error}`).join("; ")}`;
  }
  if (result.title !== state.title || result.route !== screen.route) {
    return "title or route changed";
  }
  for (const pass of [{ kind: "off" }, { kind: "on" }] as const) {
    const expected = passesOf(screen).some((item) => item.kind === pass.kind)
      ? hash(screen, state, pass)
      : null;
    const actual = result[pass.kind]?.inputHash ?? null;
    if (expected !== actual) {
      return `${passId(pass)} inputs changed`;
    }
  }
  return null;
};

/** States of states.ts with their committed result, in manifest order. */
export const pairStates = (site: SiteData | null) => {
  const committed = new Map(
    (site?.screens ?? []).flatMap((screen) =>
      screen.states.map((state): [string, StateResult] => [
        `${screen.id}/${state.id}`,
        state,
      ])
    )
  );
  return SCREENS.flatMap((screen) =>
    screen.states.map((state) => ({
      screen,
      state,
      result: committed.get(stateKey(screen, state)),
    }))
  );
};

const CHECK_FIX =
  "Run `bun sitemap capture` on a Mac with BLOB_READ_WRITE_TOKEN set, then commit apps/sitemap/sitemap.json.";

/** Images the site shows that Blob does not serve. Public URLs, no token. */
const missingImages = async (site: SiteData) => {
  const hashes = [...shownPngs(site.screens)];
  const missing: string[] = [];
  for (let index = 0; index < hashes.length; index += 16) {
    const batch = hashes.slice(index, index + 16);
    // oxlint-disable-next-line no-await-in-loop -- 16 requests at a time
    const results = await Promise.all(
      batch.map(async (hash) => {
        const response = await fetch(`${site.imageBase}/small/${hash}.png`, {
          method: "HEAD",
        });
        return response.ok ? null : hash;
      })
    );
    missing.push(...results.filter((hash): hash is string => hash !== null));
  }
  return missing;
};

/**
 * `bun sitemap check`: sitemap.json must show this checkout. CI runs it on
 * every pull request; it needs no simulator and no token.
 */
export const checkSite = async () => {
  const nativeFingerprint = await readNativeFingerprint();
  process.stdout.write(`native   ${nativeFingerprint}\n`);
  const site = readSite();
  if (!site) {
    throw new CliError({
      status: "sitemap_missing",
      message: "apps/sitemap/sitemap.json is missing",
      why: "The sitemap is committed with the code it shows.",
      fix: CHECK_FIX,
    });
  }
  const hash = createInputHasher({ source: readSource(), nativeFingerprint });
  const problems: string[] = [];
  if (site.schema !== SCHEMA_VERSION) {
    problems.push(`schema ${site.schema}, expected ${SCHEMA_VERSION}`);
  }
  if (site.nativeFingerprint !== nativeFingerprint) {
    problems.push(
      `native fingerprint ${site.nativeFingerprint.slice(0, 8)}, checkout ${nativeFingerprint.slice(0, 8)}`
    );
  }
  if (JSON.stringify(site.profile) !== JSON.stringify(DEVICE_PROFILE)) {
    problems.push("device profile changed");
  }
  if (JSON.stringify(site.flags) !== JSON.stringify(FEATURE_FLAG_DETAILS)) {
    problems.push("feature flags changed");
  }
  const cards = JSON.stringify(
    site.screens.map(({ states: _states, ...meta }) => meta)
  );
  if (cards !== JSON.stringify(SCREENS.map(screenMeta))) {
    problems.push("screen list changed in scripts/sitemap/states.ts");
  }
  const stale = pairStates(site).flatMap(({ screen, state, result }) => {
    const reason = staleReason(hash, screen, state, result);
    return reason ? [`${stateKey(screen, state)}: ${reason}`] : [];
  });
  const missing = stale.length === 0 ? await missingImages(site) : [];
  for (const line of [...problems, ...stale]) {
    process.stdout.write(`stale    ${line}\n`);
  }
  if (missing.length > 0) {
    process.stdout.write(
      `missing  ${missing.length} images, e.g. small/${missing[0]}.png\n`
    );
  }
  const states = pairStates(site).length;
  process.stdout.write(
    `summary  states=${states} stale=${stale.length} problems=${problems.length} missing-images=${missing.length}\n`
  );
  if (problems.length + stale.length + missing.length > 0) {
    throw new CliError({
      status: "sitemap_stale",
      message: "apps/sitemap/sitemap.json does not show this checkout",
      why: `${stale.length} of ${states} states stale, ${problems.length} other changes, ${missing.length} images missing in Blob.`,
      fix: CHECK_FIX,
    });
  }
  note(`Sitemap fresh: ${states} states`);
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Delete Blob files older than `days` that the committed sitemap.json does
 * not use. Used files stay at any age: the live site and the next capture
 * need them.
 */
export const pruneBlobs = async (days: number) => {
  const site = readSite();
  if (!site) {
    throw new CliError({
      status: "sitemap_missing",
      message: "apps/sitemap/sitemap.json is missing",
      why: "Prune keeps what sitemap.json uses. Without it every file looks unused.",
      fix: "Run prune on a checkout of main.",
    });
  }
  const remote = await listBlobs();
  const keep = new Set<string>();
  for (const hash of shownPngs(site.screens)) {
    keep.add(`small/${hash}.png`).add(`png/${hash}.png`);
  }
  for (const screen of site.screens) {
    for (const state of screen.states) {
      for (const pass of [state.off, state.on]) {
        const blob = pass && remote.get(`states/${pass.inputHash}.json`);
        if (blob) {
          keep.add(blob.pathname);
        }
      }
    }
  }
  const cutoff = Date.now() - days * DAY_MS;
  const stale = [...remote.values()].filter(
    (blob) =>
      !keep.has(blob.pathname) && new Date(blob.uploadedAt).getTime() < cutoff
  );
  await deleteBlobs(stale.map((blob) => blob.url));
  process.stdout.write(
    `prune    deleted=${stale.length} kept=${remote.size - stale.length} older-than=${days}d\n`
  );
};
