// `bun sitemap build`: write apps/sitemap/sitemap.json for one captured
// commit. Vercel deploys apps/sitemap from main; images load from Blob.
// `bun sitemap prune`: delete Blob files main no longer uses.
import fs from "node:fs";
import path from "node:path";

import { CliError, note, readJson } from "../cli/shared.ts";
import { blobOrigin, deleteBlobs, download, listBlobs } from "./blob.ts";
import { STATES_DIR, runDir } from "./capture.ts";
import type { CachedCapture, RunResult } from "./capture.ts";
import { FEATURE_FLAG_DETAILS } from "./flags.ts";
import { REPO_ROOT } from "./inputs.ts";

/** Committed site data. Vercel serves apps/sitemap as is. */
export const DATA_FILE = path.join(REPO_ROOT, "apps/sitemap/sitemap.json");

/** apps/sitemap/sitemap.json. */
interface SiteData extends RunResult {
  flags: typeof FEATURE_FLAG_DETAILS;
  /** Blob origin; images are `<imageBase>/small/<png hash>.png`. */
  imageBase: string;
}

const readRun = (sha: string) => {
  const file = path.join(runDir(sha), "result.json");
  const run = readJson<RunResult>(file);
  if (!run) {
    throw new CliError({
      status: "run_missing",
      message: `No capture result for ${sha.slice(0, 8)}`,
      why: `${file} does not exist.`,
      fix: "Run `bun sitemap capture` first.",
    });
  }
  return run;
};

const shownPngs = (run: Pick<RunResult, "screens">) =>
  new Set(
    run.screens.flatMap((screen) =>
      screen.states.flatMap((state) =>
        [state.off?.pngHash, state.on?.pngHash].filter((hash): hash is string =>
          Boolean(hash)
        )
      )
    )
  );

/** Last captured commit: HEAD of this checkout. */
export const resolveSha = (value: string | undefined) => {
  if (value) {
    return value;
  }
  const head = Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: REPO_ROOT });
  return head.stdout.toString().trim();
};

/**
 * Write sitemap.json of `sha`. Only a full origin/main capture may land in
 * the repository; `force` writes any capture for a local preview.
 */
export const buildSite = async (sha: string, force: boolean) => {
  const run = readRun(sha);
  if (!run.isDeployable && !force) {
    throw new CliError({
      status: "not_deployable",
      message: `Capture of ${sha.slice(0, 8)} cannot become the sitemap`,
      why: "It ran with --ref=head, --only, or --allow-native-mismatch.",
      fix: "Capture origin/main without those options. For a local preview only, pass --force and never commit the result.",
    });
  }
  const small = await listBlobs("small/");
  const missing = [...shownPngs(run)].filter(
    (hash) => !small.has(`small/${hash}.png`)
  );
  if (missing.length > 0) {
    throw new CliError({
      status: "images_missing",
      message: `${missing.length} site images are not in Blob`,
      why: `For example small/${missing[0]}.png. Capture uploads them only with BLOB_READ_WRITE_TOKEN set.`,
      fix: "Run `bun sitemap capture` with BLOB_READ_WRITE_TOKEN set, then retry.",
    });
  }
  const data: SiteData = {
    ...run,
    flags: FEATURE_FLAG_DETAILS,
    imageBase: blobOrigin(small),
  };
  fs.writeFileSync(DATA_FILE, `${JSON.stringify(data, null, 1)}\n`);
  note(`Site: ${shownPngs(run).size} images, ${run.screens.length} screens`);
  process.stdout.write(`site     ${DATA_FILE}\n`);
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Delete Blob files older than `days` that the committed sitemap.json does
 * not use. Used files stay at any age: the live site and the next capture
 * need them.
 */
export const pruneBlobs = async (days: number) => {
  const data = readJson<SiteData>(DATA_FILE);
  if (!data?.isDeployable) {
    throw new CliError({
      status: "not_deployable",
      message: "sitemap.json is missing or not from origin/main",
      why: "Prune keeps what sitemap.json uses. A partial file would delete live images.",
      fix: "Run prune on main after `bun sitemap build`.",
    });
  }
  const remote = await listBlobs();
  const keep = new Set<string>();
  for (const hash of shownPngs(data)) {
    keep.add(`small/${hash}.png`).add(`png/${hash}.png`);
  }
  for (const inputHash of data.used) {
    const pathname = `states/${inputHash}.json`;
    const blob = remote.get(pathname);
    if (blob) {
      keep.add(pathname);
      const file = path.join(STATES_DIR, `${inputHash}.json`);
      if (!fs.existsSync(file)) {
        // oxlint-disable-next-line no-await-in-loop -- small JSON files
        await download(blob.url, file);
      }
      const entry = readJson<CachedCapture>(file);
      if (entry) {
        keep.add(`png/${entry.pngHash}.png`);
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
