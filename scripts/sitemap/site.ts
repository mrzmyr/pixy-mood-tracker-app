// `bun sitemap build`: static site for one captured commit.
import fs from "node:fs";
import path from "node:path";

import { CliError, note, readJson } from "../cli/shared.ts";
import { PNG_DIR, SITEMAP_DIR, runDir } from "./capture.ts";
import type { RunResult } from "./capture.ts";
import { FEATURE_FLAG_DETAILS } from "./flags.ts";
import { REPO_ROOT } from "./inputs.ts";
import { decodePng, downscale, encodePng } from "./png.ts";
import { SITE_IMAGE_SCALE } from "./profile.ts";

const TEMPLATE_DIR = path.join(import.meta.dir, "site");
/** Downscaled images, keyed by full-size PNG hash. */
const SMALL_DIR = path.join(SITEMAP_DIR, "small");
/** Site folder of one commit, rebuilt from scratch by every build. */
export const siteDir = (sha: string) => path.join(SITEMAP_DIR, "site", sha);

/** One deployed commit in the commit switcher. */
export interface HistoryEntry {
  sha: string;
  subject: string;
  date: string;
  /** Immutable deployment URL. Empty for the commit being built. */
  url: string;
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

const smallImage = (hash: string) => {
  const file = path.join(SMALL_DIR, `${hash}.png`);
  if (!fs.existsSync(file)) {
    const full = path.join(PNG_DIR, `${hash}.png`);
    fs.mkdirSync(SMALL_DIR, { recursive: true });
    fs.writeFileSync(
      file,
      encodePng(downscale(decodePng(fs.readFileSync(full)), SITE_IMAGE_SCALE))
    );
  }
  return file;
};

/** Escape JSON for an inline <script> block. */
const escapeScript = (json: string) => json.replaceAll("<", "\\u003c");

/** Last captured commit: HEAD of this checkout. */
export const resolveSha = (value: string | undefined) => {
  if (value) {
    return value;
  }
  const head = Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: REPO_ROOT });
  return head.stdout.toString().trim();
};

/** Write the site of `sha` and return its folder. */
export const buildSite = (sha: string, history: HistoryEntry[] = []) => {
  const run = readRun(sha);
  const out = siteDir(run.sha);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, "img"), { recursive: true });
  const hashes = new Set(
    run.screens.flatMap((screen) =>
      screen.states.flatMap((state) =>
        [state.off?.pngHash, state.on?.pngHash].filter((hash): hash is string =>
          Boolean(hash)
        )
      )
    )
  );
  for (const hash of hashes) {
    fs.copyFileSync(smallImage(hash), path.join(out, "img", `${hash}.png`));
  }
  const entries = history.some((entry) => entry.sha === run.sha)
    ? history
    : [
        { sha: run.sha, subject: run.subject, date: run.date, url: "" },
        ...history,
      ];
  const data = {
    sha: run.sha,
    subject: run.subject,
    date: run.date,
    isDeployable: run.isDeployable,
    profile: run.profile,
    summary: run.summary,
    flags: FEATURE_FLAG_DETAILS,
    imageScale: 1,
    screens: run.screens,
  };
  const html = fs
    .readFileSync(path.join(TEMPLATE_DIR, "index.html"), "utf-8")
    .replace("__DATA__", () => escapeScript(JSON.stringify(data)))
    .replace("__HISTORY__", () => escapeScript(JSON.stringify(entries)))
    .replaceAll("__SHA7__", run.sha.slice(0, 7));
  fs.writeFileSync(path.join(out, "index.html"), html);
  for (const file of ["app.js", "style.css"]) {
    fs.copyFileSync(path.join(TEMPLATE_DIR, file), path.join(out, file));
  }
  fs.writeFileSync(
    path.join(out, "history.json"),
    `${JSON.stringify(entries)}\n`
  );
  note(`Site: ${hashes.size} images, ${run.screens.length} screens`);
  process.stdout.write(`site     ${out}\n`);
  return out;
};
