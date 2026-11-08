// `bun sitemap deploy`: one immutable Vercel deployment per commit. Production
// deployments move the project domain, which is the `latest` alias of main.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { CliError, note, readJson } from "../cli/shared.ts";
import { runDir } from "./capture.ts";
import type { RunResult } from "./capture.ts";
import { buildSite, resolveSha } from "./site.ts";
import type { HistoryEntry } from "./site.ts";

/** Vercel project. Its production domain is the `latest` alias. */
export const PROJECT = "pixy-mood-tracker-sitemap";

/** Deployment metadata that rebuilds the commit index from Vercel alone. */
const META_SHA = "sitemapSha";
const META_SUBJECT = "sitemapSubject";
const META_DATE = "sitemapDate";

const readScope = () => {
  const scope = process.env.SITEMAP_VERCEL_SCOPE?.trim();
  if (!scope) {
    throw new CliError({
      exitCode: 2,
      status: "vercel_scope_missing",
      message: "SITEMAP_VERCEL_SCOPE is not set",
      why: "The sitemap deploys to a private Vercel team. The repository does not name it.",
      fix: "Set SITEMAP_VERCEL_SCOPE to the team slug (`vercel teams ls`). CI reads it from a repository secret.",
    });
  }
  return scope;
};

const vercel = (args: string[], scope: string) => {
  const token = process.env.VERCEL_TOKEN?.trim();
  const result = spawnSync(
    "vercel",
    [
      ...args,
      "--scope",
      scope,
      "--non-interactive",
      ...(token ? ["--token", token] : []),
    ],
    { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024, timeout: 15 * 60_000 }
  );
  if (result.error || result.status !== 0) {
    const redact = (text: string) =>
      token ? text.replaceAll(token, "<token>") : text;
    const lastLine = redact(
      `${result.stderr ?? ""}`.trim().split("\n").at(-1) ?? ""
    );
    throw new CliError({
      status: "vercel_failed",
      message: `\`vercel ${args[0]}\` failed`,
      why: result.error
        ? result.error.message
        : `Exit ${result.status}. ${lastLine}`,
      fix: "Run `vercel whoami`. Locally: `vercel login`. CI: check the VERCEL_TOKEN secret.",
    });
  }
  return result.stdout;
};

/** Production deployments of earlier commits, newest first. */
const listHistory = (scope: string): HistoryEntry[] => {
  let output: string;
  try {
    output = vercel(
      [
        "list",
        PROJECT,
        "--environment",
        "production",
        "--format",
        "json",
        "--limit",
        "100",
      ],
      scope
    );
  } catch (error) {
    note(
      `warning [history_unavailable]: commit index starts empty\n  why: ${error instanceof CliError ? error.why : String(error)}\n  fix: First deploy creates project ${PROJECT}. Later deploys list it.`
    );
    return [];
  }
  // SAFETY: vercel list --format json prints { deployments: [...] }.
  const { deployments = [] } = JSON.parse(output) as {
    deployments?: {
      url: string;
      state?: string;
      meta?: Record<string, string>;
    }[];
  };
  const seen = new Set<string>();
  return deployments
    .filter(
      (deployment) =>
        deployment.state === "READY" && deployment.meta?.[META_SHA]
    )
    .map((deployment) => ({
      sha: deployment.meta?.[META_SHA] ?? "",
      subject: deployment.meta?.[META_SUBJECT] ?? "",
      date: deployment.meta?.[META_DATE] ?? "",
      url: `https://${deployment.url}`,
    }))
    .filter((entry) => !seen.has(entry.sha) && seen.add(entry.sha));
};

const VERCEL_JSON = {
  headers: [
    {
      source: "/img/(.*)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
  ],
};

/**
 * Deploy one captured commit. Production needs a deployable capture: full,
 * from origin/main, native shell matching.
 */
export const deployFor = (values: Record<string, string | undefined>) => {
  const sha = resolveSha(values.sha);
  const run = readJson<RunResult>(path.join(runDir(sha), "result.json"));
  const target = values.target ?? "production";
  if (run && target === "production" && !run.isDeployable) {
    throw new CliError({
      status: "not_deployable",
      message: `Capture of ${sha.slice(0, 8)} cannot become latest`,
      why: "It ran with --ref=head, --only, or --allow-native-mismatch.",
      fix: "Capture origin/main without those options, or pass --target=preview for a throwaway deployment.",
    });
  }
  const scope = readScope();
  const history = target === "production" ? listHistory(scope) : [];
  const dir = buildSite(sha, history);
  fs.writeFileSync(
    path.join(dir, "vercel.json"),
    `${JSON.stringify(VERCEL_JSON, null, 2)}\n`
  );
  const subject = (run?.subject ?? "").slice(0, 200);
  const output = vercel(
    [
      "deploy",
      dir,
      "--project",
      PROJECT,
      "--yes",
      ...(target === "production" ? ["--prod"] : ["--target", "preview"]),
      "--meta",
      `${META_SHA}=${sha}`,
      "--meta",
      `${META_SUBJECT}=${subject}`,
      "--meta",
      `${META_DATE}=${run?.date ?? ""}`,
      "--format",
      "json",
    ],
    scope
  );
  let url = output.trim().split("\n").at(-1) ?? "";
  try {
    // SAFETY: vercel deploy --format json prints the deployment object.
    const body = JSON.parse(output) as {
      url?: string;
      deployment?: { url?: string };
    };
    url = body.deployment?.url ?? body.url ?? url;
  } catch {
    // Older CLIs print the URL only.
  }
  url = url.startsWith("http") ? url : `https://${url}`;
  process.stdout.write(`deploy   ${url}\n`);
  if (target === "production") {
    process.stdout.write(
      `latest   https://${PROJECT}.vercel.app (project domain, moves with each main deploy)\n`
    );
  }
  return url;
};
