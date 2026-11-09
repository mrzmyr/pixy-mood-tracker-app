// `bun sitemap`: screenshots of every screen and state from origin/main,
// published as a static sitemap in apps/sitemap. Code: scripts/sitemap.
import { captureFor } from "../sitemap/capture.ts";
import { CLOCK_BUDGET_SECONDS, DEVICE_PROFILE } from "../sitemap/profile.ts";
import { buildSite, pruneBlobs, resolveSha } from "../sitemap/site.ts";
import { defineCommand } from "./shared.ts";
import type { Noun } from "./shared.ts";

const { model, runtime, locale, timeZone } = DEVICE_PROFILE;

/** `bun sitemap` noun: capture, build, prune. Code lives in scripts/sitemap. */
export const SITEMAP: Noun = {
  summary:
    "Capture every screen and state, write apps/sitemap/sitemap.json, prune Blob.",
  commandOrder: ["capture", "build", "prune"],
  commands: {
    capture: defineCommand({
      summary:
        "Capture every state in scripts/sitemap/states.ts on the pinned commit.",
      usage:
        "Usage: bun sitemap capture [--only=<screen|screen/state,...>] [--verify=<n>] [--ref=head] [--allow-native-mismatch] [--prune]",
      options: {
        only: {
          value: "<ids>",
          description: [
            "Comma-separated screen or <screen>/<state> ids.",
            "Partial runs never become the sitemap.",
          ],
        },
        verify: {
          value: "<n>",
          description: [
            "Capture n cached states again and compare PNG hashes.",
            "Default 0. CI uses 2.",
          ],
        },
        ref: {
          value: "<head>",
          choices: ["head"],
          description: [
            "head: capture HEAD as is, also when it is not origin/main.",
            "For capture logic work only; never becomes the sitemap.",
          ],
        },
        prune: {
          description: [
            "After a full run, delete cache entries and PNGs the run did not use.",
            "CI uses it so its cache does not grow.",
          ],
        },
        "allow-native-mismatch": {
          description: [
            "Capture on a cached Release shell of another native fingerprint.",
            "Never becomes the sitemap.",
          ],
        },
      },
      sections: [
        {
          title: "Behavior",
          lines: [
            "Pin       `git fetch origin main`. HEAD must equal origin/main with a clean tree.",
            "Preflight One line per check: commit, ram, disk, runtime, metro, native.",
            "Build     `expo export` of the preview JS with EXPO_PUBLIC_SITEMAP_CAPTURE=1, put into",
            "          the cached iOS Release shell. Frozen clock, seeded Math.random, no network,",
            "          no keyboard, reduced motion, invisible probes. No Metro, no LogBox.",
            `Device    ${model}, iOS ${runtime.version} (${runtime.build}), ${locale}, ${timeZone}, light,`,
            "          text size large, status bar 9:41.",
            "Capture   Per state and pass: relaunch, fixture link, flag link, check flag probes,",
            "          route link, wait, settle, screenshot, accessibility tree.",
            "Passes    off: production default. on: every overridable flag. Flagged elements of",
            "          the on tree are attributed by turning candidate flag halves on (bisection).",
            "Cache     Input hash = file blobs the route imports, shared build files, native",
            "          fingerprint, device profile, fixture, flags, route, wait. Equal",
            "          hash: cached PNG reused. Recaptured hash with new PNG: nondeterministic.",
            "Blob      With BLOB_READ_WRITE_TOKEN: cache misses download from Vercel Blob, new",
            "          captures and site images upload at the end, also after failures.",
          ],
        },
        {
          title: "Output",
          lines: [
            "stdout, one line per capture as it finishes:",
            "  <cached|captured|verified|retry|fail> <screen>/<state> <pass> in=<hash> png=<hash> <ms>",
            "fail lines add why, fix, and saved screen.png, tree.json, crash report.",
            "Last lines: summary counts and result.json path.",
            "Files: ~/.cache/pixy-mood-tracker/sitemap/{states,png,apps,runs/<sha>}.",
          ],
        },
        {
          title: "Examples",
          lines: [
            "bun sitemap capture",
            "bun sitemap capture --only=settings,calendar/year --ref=head",
            "bun sitemap capture --verify=2",
          ],
        },
      ],
      errors: {
        source_not_origin_main: "HEAD is not a clean origin/main",
        preflight_ram: "Less than 4 GiB RAM headroom",
        preflight_load: "Load above 2x cores",
        preflight_disk: "Less than 10 GiB free disk",
        preflight_runtime: `iOS ${runtime.version} (${runtime.build}) missing or host not arm64`,
        preflight_metro: "node_modules lacks @expo/cli",
        preflight_native: "No Release shell for the native fingerprint",
        simulator_profile_mismatch: `Checkout simulator is not ${model} on iOS ${runtime.version}`,
        a11y_empty: "Empty accessibility tree; relaunched once",
        probe_missing: "Installed app is not a capture build",
        fixture_timeout: "Fixture link did not finish",
        filters_stale:
          "Calendar filters active after fixture load; relaunched once",
        flags_wrong:
          "Flag probes differ from the pass after relaunch; relaunched once",
        route_timeout: "Route link did not open the route",
        wait_failed: "Wait condition did not show",
        system_alert: "System alert on screen",
        settle_timeout: "Screen kept changing",
        clock_budget_exceeded: `State took over ${CLOCK_BUDGET_SECONDS}s from launch; relaunched once`,
        app_crashed: "App process died; crash report attached",
        nondeterministic: "Same input hash, new PNG hash",
        capture_failed: "At least one capture failed",
      },
      run: async (values) => {
        await captureFor(values);
      },
    }),
    build: defineCommand({
      summary: "Write apps/sitemap/sitemap.json for one captured commit.",
      usage: "Usage: bun sitemap build [--sha=<sha>] [--force]",
      options: {
        sha: {
          value: "<sha>",
          description: ["Captured commit. Default: HEAD."],
        },
        force: {
          description: [
            "Write a capture that is not a full origin/main run.",
            "Local preview only; never commit the result.",
          ],
        },
      },
      sections: [
        {
          title: "Requires",
          lines: [
            "BLOB_READ_WRITE_TOKEN: images load from Vercel Blob. CI reads it from a secret.",
          ],
        },
        {
          title: "Behavior",
          lines: [
            "Checks every shown image is in Blob, then writes sitemap.json with the Blob origin.",
            "CI commits it to main. Vercel deploys apps/sitemap on that commit.",
            "Preview: `bunx serve apps/sitemap`.",
          ],
        },
      ],
      errors: {
        run_missing: "No capture result for the commit",
        not_deployable:
          "Capture used --ref=head, --only, or --allow-native-mismatch",
        images_missing: "Shown images not uploaded to Blob",
        blob_token_missing: "BLOB_READ_WRITE_TOKEN not set",
        blob_failed: "Vercel Blob request failed",
      },
      run: async (values) => {
        await buildSite(resolveSha(values.sha), values.force !== undefined);
      },
    }),
    prune: defineCommand({
      summary: "Delete Blob files that sitemap.json does not use.",
      usage: "Usage: bun sitemap prune [--days=<n>]",
      options: {
        days: {
          value: "<n>",
          description: ["Keep unused files younger than n days. Default 30."],
        },
      },
      sections: [
        {
          title: "Behavior",
          lines: [
            "Keeps every file the committed sitemap.json uses, at any age: shown images and",
            "the cache entries of every input hash the run looked up. CI runs it after build.",
          ],
        },
      ],
      errors: {
        not_deployable: "sitemap.json missing or not from origin/main",
        blob_token_missing: "BLOB_READ_WRITE_TOKEN not set",
        blob_failed: "Vercel Blob request failed",
      },
      run: async (values) => {
        await pruneBlobs(Number(values.days ?? 30));
      },
    }),
  },
};
