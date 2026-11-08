// `bun sitemap`: screenshots of every screen and state from origin/main,
// published as a static sitemap. Code: scripts/sitemap.
import { captureFor } from "../sitemap/capture.ts";
import { deployFor } from "../sitemap/deploy.ts";
import { CLOCK_BUDGET_SECONDS, DEVICE_PROFILE } from "../sitemap/profile.ts";
import { buildSite, resolveSha } from "../sitemap/site.ts";
import { defineCommand } from "./shared.ts";
import type { Noun } from "./shared.ts";

const { model, runtime, locale, timeZone } = DEVICE_PROFILE;

/** `bun sitemap` noun: capture, build, deploy. Code lives in scripts/sitemap. */
export const SITEMAP: Noun = {
  summary: "Capture every screen and state, build the sitemap site, deploy it.",
  commandOrder: ["capture", "build", "deploy"],
  commands: {
    capture: defineCommand({
      summary:
        "Capture every state in scripts/sitemap/states.ts on the pinned commit.",
      usage:
        "Usage: bun sitemap capture [--only=<screen|screen/state,...>] [--verify=<n>] [--ref=head] [--allow-native-mismatch]",
      options: {
        only: {
          value: "<ids>",
          description: [
            "Comma-separated screen or <screen>/<state> ids.",
            "Partial runs never deploy.",
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
            "For capture logic work only; never deploys.",
          ],
        },
        "allow-native-mismatch": {
          description: [
            "Capture on a cached Release shell of another native fingerprint.",
            "Never deploys.",
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
            "          route link, steps, wait, settle, screenshot, accessibility tree.",
            "Passes    off: production default. on: every overridable flag. Flagged elements of",
            "          the on tree are attributed by turning candidate flag halves on (bisection).",
            "Cache     Input hash = file blobs the route imports, shared build files, native",
            "          fingerprint, device profile, fixture, flags, route, steps, wait. Equal",
            "          hash: cached PNG reused. Recaptured hash with new PNG: nondeterministic.",
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
        step_failed: "A step selector failed",
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
      summary: "Build the static site of one captured commit.",
      usage: "Usage: bun sitemap build [--sha=<sha>]",
      options: {
        sha: {
          value: "<sha>",
          description: ["Captured commit. Default: HEAD."],
        },
      },
      sections: [
        {
          title: "Output",
          lines: [
            "Site folder on stdout: ~/.cache/pixy-mood-tracker/sitemap/site/<sha>.",
            "Open its index.html in a browser. No server needed.",
          ],
        },
      ],
      errors: { run_missing: "No capture result for the commit" },
      run: (values) => {
        buildSite(resolveSha(values.sha));
      },
    }),
    deploy: defineCommand({
      summary: "Deploy the site of one captured commit to Vercel.",
      usage:
        "Usage: bun sitemap deploy [--sha=<sha>] [--target=<production|preview>]",
      options: {
        sha: {
          value: "<sha>",
          description: ["Captured commit. Default: HEAD."],
        },
        target: {
          value: "<production|preview>",
          choices: ["production", "preview"],
          description: [
            "production: moves the latest alias. Needs a full origin/main capture.",
            "preview: throwaway deployment of any capture. Default: production.",
          ],
        },
      },
      sections: [
        {
          title: "Requires",
          lines: [
            "SITEMAP_VERCEL_SCOPE: Vercel team slug. VERCEL_TOKEN in CI, `vercel login` locally.",
          ],
        },
        {
          title: "Behavior",
          lines: [
            "Lists earlier production deployments by their sitemapSha metadata for the commit",
            "switcher, builds the site, deploys it. Each deployment URL is immutable.",
          ],
        },
      ],
      errors: {
        vercel_scope_missing: "SITEMAP_VERCEL_SCOPE not set",
        not_deployable:
          "Capture used --ref=head, --only, or --allow-native-mismatch",
        vercel_failed: "Vercel CLI failed",
        run_missing: "No capture result for the commit",
      },
      run: (values) => {
        deployFor(values);
      },
    }),
  },
};
