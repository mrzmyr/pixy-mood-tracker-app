// `bun sitemap`: screenshots of every screen and state, committed as
// apps/sitemap/sitemap.json with the code they show. Code: scripts/sitemap.
import { captureFor } from "../sitemap/capture.ts";
import {
  ANDROID_PROFILE,
  CLOCK_BUDGET_SECONDS,
  DEVICE_PROFILE,
} from "../sitemap/profile.ts";
import { checkSite, pruneBlobs } from "../sitemap/site.ts";
import { defineCommand } from "./shared.ts";
import type { Noun } from "./shared.ts";

const { model, runtime, locale, timeZone } = DEVICE_PROFILE;

/** `bun sitemap` noun: capture, check, prune. Code lives in scripts/sitemap. */
export const SITEMAP: Noun = {
  summary:
    "Capture changed screens into apps/sitemap/sitemap.json, check it, prune Blob.",
  commandOrder: ["capture", "check", "prune"],
  commands: {
    capture: defineCommand({
      summary:
        "Capture states whose inputs changed, upload to Blob, write sitemap.json.",
      usage:
        "Usage: bun sitemap capture [--platform=<ios|android>] [--only=<screen|screen/state,...>] [--verify=<n>] [--allow-native-mismatch]",
      options: {
        platform: {
          value: "<ios|android>",
          choices: ["ios", "android"],
          description: [
            "Capture one platform only, light and dark.",
            "The other platform's stale states stay stale; check still fails.",
          ],
        },
        only: {
          value: "<ids>",
          description: [
            "Comma-separated screen or <screen>/<state> ids.",
            "Other stale states stay stale; `bun sitemap check` still fails.",
          ],
        },
        verify: {
          value: "<n>",
          description: [
            "Capture n fresh states again and compare PNG hashes.",
            "Default 0.",
          ],
        },
        "allow-native-mismatch": {
          description: [
            "Capture on a cached Release shell of another native fingerprint.",
            "For capture logic work; never writes sitemap.json.",
          ],
        },
      },
      sections: [
        {
          title: "Requires",
          lines: [
            "BLOB_READ_WRITE_TOKEN: cache and images live in Vercel Blob.",
            "iOS: the pinned iOS runtime and a Release shell for the native fingerprint.",
            `Android: ${ANDROID_PROFILE.systemImage.package} r${ANDROID_PROFILE.systemImage.revision}, JDK 17, Android SDK.`,
          ],
        },
        {
          title: "Behavior",
          lines: [
            "Variants  ios-light, ios-dark, android-light, android-dark. Each is captured and checked.",
            "Plan      Input hash per state, variant, and pass from the working tree. Fresh",
            "          when sitemap.json has the same hashes and Blob has its images. Nothing",
            "          stale: rewrite sitemap.json and stop, no device.",
            "Preflight iOS: ram, disk, runtime, metro, native. Android: system image revision.",
            "Build     Preview JS with EXPO_PUBLIC_SITEMAP_CAPTURE=1. iOS: `expo export` into the",
            "          cached Release shell. Android: incremental Gradle release build in android/.",
            "          Frozen clock, seeded Math.random, no network, no keyboard, reduced motion,",
            "          invisible probes. No Metro, no LogBox.",
            `Device    ${model}, iOS ${runtime.version} (${runtime.build}), ${locale}, ${timeZone},`,
            "          text size large, status bar 9:41.",
            `          ${ANDROID_PROFILE.model} emulator, ${ANDROID_PROFILE.locale}, font scale ${ANDROID_PROFILE.fontScale},`,
            "          animations off, demo status bar 09:41.",
            "Appearance Light, then dark, per platform. Attribution runs on light only.",
            "Capture   Stale states only. Per state and pass: relaunch, fixture link, flag link,",
            "          check flag probes, route link, wait, settle, screenshot, accessibility tree.",
            "Passes    off: production default. on: every overridable flag. Flagged elements of",
            "          the on tree are attributed by turning candidate flag halves on (bisection).",
            "Cache     Input hash = file blobs the route imports, shared build files, native",
            "          fingerprint, device profile, fixture, flags, route, wait. A hash already",
            "          in Blob reuses its PNG. Recaptured hash with new PNG: nondeterministic.",
            "Write     Upload new captures and site images to Blob, then write",
            "          apps/sitemap/sitemap.json, also after failures. Commit it with the code.",
          ],
        },
        {
          title: "Output",
          lines: [
            "stdout: one `stale` line per stale state, then one line per capture:",
            "  <cached|captured|verified|retry|fail> <screen>/<state> <pass> in=<hash> png=<hash> <ms>",
            "fail lines add why, fix, and saved screen.png, tree.json, crash report.",
            "Last lines: summary counts and the sitemap.json path.",
            "Files: ~/.cache/pixy-mood-tracker/sitemap/{states,png,small,apps,runs/<sha>}.",
          ],
        },
        {
          title: "Examples",
          lines: [
            "bun sitemap capture",
            "bun sitemap capture --only=settings,calendar/year",
            "bun sitemap capture --verify=2",
          ],
        },
      ],
      errors: {
        blob_token_missing: "BLOB_READ_WRITE_TOKEN not set",
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
        try {
          await captureFor(values);
        } finally {
          // A Blob request that timed out keeps its socket and the process
          // alive. Exit once the CLI has printed the result.
          setTimeout(() => process.exit(), 1000);
        }
      },
    }),
    check: defineCommand({
      summary:
        "Fail when apps/sitemap/sitemap.json does not show this checkout.",
      usage: "Usage: bun sitemap check",
      options: {},
      sections: [
        {
          title: "Behavior",
          lines: [
            "Computes every input hash from the working tree, like capture, and compares",
            "them with sitemap.json. Also checks screen list, flags, device profile, native",
            "fingerprint, failed captures, and that Blob serves every shown image.",
            "No simulator, no token. CI runs it on every pull request and push to main.",
          ],
        },
      ],
      errors: {
        sitemap_missing: "apps/sitemap/sitemap.json is missing",
        sitemap_stale: "sitemap.json does not show this checkout",
      },
      run: async () => {
        await checkSite();
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
            "the cache entries of their input hashes. CI runs it on pushes to main.",
          ],
        },
      ],
      errors: {
        sitemap_missing: "apps/sitemap/sitemap.json is missing",
        blob_token_missing: "BLOB_READ_WRITE_TOKEN not set",
        blob_failed: "Vercel Blob request failed",
      },
      run: async (values) => {
        await pruneBlobs(Number(values.days ?? 30));
      },
    }),
  },
};
