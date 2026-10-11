// Flows known to fail on main, so a run can tell new failures from old ones.
import fs from "node:fs";
import path from "node:path";

import { z } from "zod";

import { CliError } from "./shared.ts";

/** Known failures list, relative to the repository root. */
export const KNOWN_FAILURES_FILE = "e2e/known-failures.json";

const knownFailuresSchema = z.array(
  z.strictObject({
    flow: z
      .string()
      .regex(/^e2e\/.+\.ya?ml$/u, "Use a path like e2e/flows/x.yaml"),
    reason: z.string().min(1),
    since: z.iso.date(),
  })
);

/** One flow that fails on main: path, cause, and first day seen. */
export type KnownFailure = z.infer<typeof knownFailuresSchema>[number];

/** Entries of e2e/known-failures.json. */
export const readKnownFailures = (root: string): KnownFailure[] => {
  const file = path.join(root, KNOWN_FAILURES_FILE);
  const invalid = (why: string) =>
    new CliError({
      exitCode: 2,
      status: "known_failures_invalid",
      message: `Could not read ${KNOWN_FAILURES_FILE}`,
      why,
      fix: 'Make it a JSON array of { "flow", "reason", "since" } objects, then retry.',
    });
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (error) {
    throw invalid(error instanceof Error ? error.message : String(error));
  }
  const result = knownFailuresSchema.safeParse(parsed);
  if (!result.success) {
    throw invalid(z.prettifyError(result.error));
  }
  return result.data;
};

const unescapeXml = (text: string) =>
  text
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

const TESTCASE =
  /<testcase\b(?<attributes>[^>]*?)(?:\/>|>(?<body>[\s\S]*?)<\/testcase>)/gu;
const FILE_ATTRIBUTE = /\bfile="(?<file>[^"]*)"/u;

/** Repository-relative flows that failed in one agent-device JUnit report. */
export const readFailedFlows = (root: string, junitFile: string) =>
  [...fs.readFileSync(junitFile, "utf-8").matchAll(TESTCASE)].flatMap(
    ({ groups }) => {
      const file = FILE_ATTRIBUTE.exec(groups?.attributes ?? "")?.groups?.file;
      return file && /<(?:failure|error)\b/u.test(groups?.body ?? "")
        ? [path.relative(root, unescapeXml(file))]
        : [];
    }
  );

/** Splits failed flows into new failures and entries of the known list. */
export const splitFailures = (failed: string[], known: KnownFailure[]) => {
  const byFlow = new Map(known.map((entry) => [entry.flow, entry]));
  return {
    fresh: failed.filter((flow) => !byFlow.has(flow)),
    known: failed.flatMap((flow) => byFlow.get(flow) ?? []),
  };
};

/** e2e_failed error that names new and known failures apart. */
export const toFailedFlowsError = ({
  failed,
  known,
  total,
  retry,
  artifactsDir,
}: {
  failed: string[];
  known: KnownFailure[];
  total?: number;
  retry: string;
  artifactsDir: string;
}) => {
  const split = splitFailures(failed, known);
  const counts = `${split.fresh.length} new, ${split.known.length} known`;
  return new CliError({
    status: "e2e_failed",
    message:
      total === undefined
        ? `${failed.length} flows failed (${counts})`
        : `${failed.length} of ${total} flows failed (${counts})`,
    why: [
      `New: ${split.fresh.length ? split.fresh.join(", ") : "none"}.`,
      split.known.length
        ? `Known (${KNOWN_FAILURES_FILE}): ${split.known
            .map(
              ({ flow, reason, since }) => `${flow} since ${since}: ${reason}`
            )
            .join("; ")}.`
        : `Known (${KNOWN_FAILURES_FILE}): none.`,
    ].join(" "),
    fix: split.fresh.length
      ? `Fix new failures first. Read artifacts in ${artifactsDir}, then retry: ${retry}${split.fresh.join(",")}.`
      : `Only known failures. Fix them or keep them in ${KNOWN_FAILURES_FILE}.`,
  });
};
