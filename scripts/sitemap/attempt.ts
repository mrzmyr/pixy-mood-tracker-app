// One capture attempt: launch, fixture, flags, route, wait, settle,
// screenshot, tree. Part of every input hash (inputs.ts SHARED_PATTERNS):
// a change here captures every state again.
import { setTimeout as sleep } from "node:timers/promises";

import { CaptureError, PREVIEW } from "./device.ts";
import type { Driver } from "./device.ts";
import { OVERRIDABLE_FLAGS } from "./flags.ts";
import { passFlags } from "./manifest.ts";
import type { Pass, ScreenSpec, StateSpec } from "./manifest.ts";
import { decodePng, hashPixels } from "./png.ts";
import { CLOCK_BUDGET_SECONDS } from "./profile.ts";
import { normalizeTree } from "./tree.ts";
import type { RawNode } from "./tree.ts";

const trap = (
  status: string,
  message: string,
  why: string,
  fix: string,
  isRetryable = false
) => new CaptureError({ status, message, why, fix }, isRetryable);

/** Screenshots until two in a row have equal pixels. */
const settle = async (driver: Driver, file: string) => {
  let previous: string | null = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const bytes = driver.screenshot(file);
    const hash = hashPixels(decodePng(bytes));
    if (hash === previous) {
      return bytes;
    }
    previous = hash;
    // oxlint-disable-next-line no-await-in-loop -- wait for the next frame set
    await sleep(300);
  }
  throw trap(
    "settle_timeout",
    "Screen kept changing",
    "30 screenshots 300 ms apart all differed. An animation or timer runs.",
    "Gate the loop on `useReducedMotion()`: capture turns iOS Reduce Motion on. Or pick a still state."
  );
};

/** One attempt of one state and pass. Throws a CaptureError on a named trap. */
export const attempt = async (
  driver: Driver,
  screen: ScreenSpec,
  state: StateSpec,
  pass: Pass,
  tmpFile: string
) => {
  const flags = passFlags(screen, pass);
  await driver.launch();
  const started = await driver.pollProbes(
    (probes) => probes.route !== null,
    30_000
  );
  if (!started.isDone) {
    throw started.nodes.length <= 1
      ? trap(
          "a11y_empty",
          "Accessibility snapshot is empty after launch",
          "agent-device returned no app elements. The XCTest runner lost the app.",
          "Relaunch runs once. Still empty: `bunx agent-device daemon stop`, then retry.",
          true
        )
      : trap(
          "probe_missing",
          "Capture probes missing",
          "The app has no sitemap-route element. The installed app is not a capture build.",
          "Delete ~/.cache/pixy-mood-tracker/sitemap/apps, then retry."
        );
  }
  driver.openUrl(`${PREVIEW.scheme}://dev/fixture?id=${state.fixture}`);
  const loaded = await driver.pollProbes(
    (probes) =>
      probes.route !== null &&
      probes.route !== "/dev/fixture" &&
      probes.route !== "/",
    30_000
  );
  if (!loaded.isDone) {
    throw trap(
      "fixture_timeout",
      `Fixture ${state.fixture} did not load`,
      `Route stayed ${loaded.probes.route}.`,
      "Open the fixture link by hand and read tree.json."
    );
  }
  if (loaded.probes.filters !== "0") {
    throw trap(
      "filters_stale",
      "Calendar filters active after fixture load",
      `Filter probe says ${loaded.probes.filters} filters. Earlier state leaked into this launch.`,
      "Relaunch runs once. Still active: fix filter reset on fixture load.",
      true
    );
  }
  // Every pass opens the flag link, so every pass reaches the route through
  // the same navigation. Off pass: `remote` clears overrides, which is the
  // production default here because remote flags never load.
  const linkKeys = flags.length > 0 ? flags : OVERRIDABLE_FLAGS;
  driver.openUrl(
    `${PREVIEW.scheme}://dev/feature-flag?key=${linkKeys.join(",")}&value=${flags.length > 0 ? "on" : "remote"}`
  );
  const expected = new Set(flags);
  const flagged = await driver.pollProbes(
    (probes) =>
      probes.route !== "/dev/feature-flag" &&
      OVERRIDABLE_FLAGS.every(
        (flag) => probes.flags.get(flag) === (expected.has(flag) ? "on" : "off")
      ),
    20_000
  );
  if (!flagged.isDone) {
    const wrong = OVERRIDABLE_FLAGS.filter(
      (flag) =>
        flagged.probes.flags.get(flag) !== (expected.has(flag) ? "on" : "off")
    );
    throw trap(
      "flags_wrong",
      `Flags not as expected after relaunch: ${wrong.join(", ")}`,
      `Expected on: ${flags.join(", ") || "none"}. Overrides end at app restart; the link must set them again.`,
      "Relaunch runs once. Still wrong: check DevFeatureFlagLinkScreen.",
      true
    );
  }
  const { route } = screen;
  // The probe reports the decoded pathname.
  const pathname = decodeURIComponent(route.split("?")[0] ?? route);
  if (flagged.probes.route !== pathname) {
    driver.openPath(route);
    const routed = await driver.pollProbes(
      (probes) => probes.route === pathname,
      20_000
    );
    if (!routed.isDone) {
      throw trap(
        "route_timeout",
        `Route ${route} did not open`,
        `Route probe says ${routed.probes.route}.`,
        "Check the route in scripts/sitemap/states.ts and the screen's redirect logic."
      );
    }
  }
  try {
    await driver.waitFor(state.wait);
  } catch (error) {
    throw trap(
      "wait_failed",
      `Wait condition ${state.wait} failed`,
      error instanceof Error ? error.message : String(error),
      "Compare the selector with the saved tree.json and screen.png."
    );
  }
  const alert = await driver.readAlert();
  if (alert) {
    throw trap(
      "system_alert",
      "System alert on screen",
      `Alert: ${alert}.`,
      "Find the code that asks for the permission and keep it out of this state, or grant it in device.ts prepare."
    );
  }
  const bytes = await settle(driver, tmpFile);
  const nodes: RawNode[] = await driver.snapshot();
  if (nodes.filter((node) => node.type !== "Application").length < 2) {
    throw trap(
      "a11y_empty",
      "Accessibility snapshot is empty",
      "Screenshot shows the app but the tree has no elements.",
      "Relaunch runs once. Still empty: `bunx agent-device daemon stop`, then retry.",
      true
    );
  }
  const seconds = driver.secondsSinceLaunch();
  if (seconds > CLOCK_BUDGET_SECONDS) {
    throw trap(
      "clock_budget_exceeded",
      `State took ${seconds.toFixed(0)}s from launch`,
      `The app clock started at 09:41:00. After ${CLOCK_BUDGET_SECONDS}s a minute can roll over and change pixels.`,
      "Relaunch runs once. Still slow: check load (`uptime`).",
      true
    );
  }
  return { bytes, tree: normalizeTree(nodes) };
};
