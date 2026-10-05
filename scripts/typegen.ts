// `bun run type-check` runs this before `tsc`.
//
// Expo Router writes route types to `.expo/types/router.d.ts` only while a dev
// server runs. A file left from an older checkout lists removed routes, so
// local `tsc` fails while CI (no `.expo/`) passes. This script deletes the file
// and regenerates it headlessly with `expo customize tsconfig.json`.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { CliError } from "./cli/shared.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const EXPO = path.join(ROOT, "node_modules", ".bin", "expo");
const ROUTER_TYPES = path.join(ROOT, ".expo", "types", "router.d.ts");
const TSCONFIG = path.join(ROOT, "tsconfig.json");

const runExpoCustomize = () => {
  // `expo customize` can rewrite tsconfig.json. Keep the checked-in file as is.
  const tsconfig = fs.readFileSync(TSCONFIG, "utf-8");
  try {
    // Route types do not depend on the app variant, but app.config.ts throws without one.
    return spawnSync(EXPO, ["customize", "tsconfig.json"], {
      cwd: ROOT,
      encoding: "utf-8",
      env: { ...process.env, CI: "1", EXPO_PUBLIC_APP_VARIANT: "development" },
      timeout: 120_000,
    });
  } finally {
    if (fs.readFileSync(TSCONFIG, "utf-8") !== tsconfig) {
      fs.writeFileSync(TSCONFIG, tsconfig);
    }
  }
};

const generate = () => {
  // Never keep a stale file: tsc must see fresh types or none.
  fs.rmSync(ROUTER_TYPES, { force: true });

  const result = runExpoCustomize();
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`
    .split("\n")
    .filter((line) => !line.startsWith("    at "))
    .join("\n")
    .trim();

  if (result.error || result.status !== 0) {
    throw new CliError({
      fix: "Run `bun install`, then fix the Expo error in `why` and retry.",
      message: "Typed routes could not be generated",
      status: "typegen_failed",
      why: result.error
        ? result.error.message
        : `\`expo customize tsconfig.json\` exited with ${result.status ?? result.signal}.\n${output}`,
    });
  }
  // `expo customize` logs and swallows some errors, so check the output file too.
  if (!fs.existsSync(ROUTER_TYPES)) {
    throw new CliError({
      fix: "Check that `experiments.typedRoutes` is on in app.json, then run `bun run start` once to see the Expo error.",
      message: "Typed routes file is missing",
      status: "typegen_no_output",
      why: `\`expo customize tsconfig.json\` exited 0 but wrote no ${path.relative(ROOT, ROUTER_TYPES)}.\n${output}`,
    });
  }
};

try {
  generate();
} catch (error) {
  const fields =
    error instanceof CliError
      ? error
      : {
          fix: "Check the output above, then retry.",
          message: "Typed routes could not be generated",
          status: "typegen_error",
          why: error instanceof Error ? error.message : String(error),
        };
  console.error(
    `error [${fields.status}]: ${fields.message}\n  why: ${fields.why}\n  fix: ${fields.fix}`
  );
  process.exitCode = 1;
}
