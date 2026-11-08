// Types and checks for the checked-in state list (states.ts).
import { FEATURE_FLAGS, OVERRIDABLE_FLAGS } from "./flags.ts";
import type { FeatureFlag } from "./flags.ts";

/**
 * agent-device selector, for example `id="calendar-list"` or
 * `role="button" label="Settings"`. Prefer `id=` (a testID). Use `label=`
 * only for native header items, which take no testID.
 */
export type Selector = string;

/** One action after the route opened. No coordinates, no sleeps. */
export type Step =
  | { press: Selector }
  | { scroll: "up" | "down"; until: Selector }
  | { wait: Selector };

/** One state of a screen: fixture plus steps, proven by a named element. */
export interface StateSpec {
  /** Unique within the screen. The first state is the screen's default. */
  id: string;
  title: string;
  /** Fixture id from src/dev/fixtures. Loaded after every launch. */
  fixture: string;
  /** Deep link path. Default: the screen route. */
  route?: string;
  steps?: Step[];
  /** Element that must show before the screenshot. */
  wait: Selector;
}

/** One screen: a card in the sitemap tree. */
export interface ScreenSpec {
  id: string;
  title: string;
  /** Deep link path, opened as `<scheme>://<path>` after the fixture loads. */
  route: string;
  /** Parent card in the tree. `null` for the root. */
  parent: string | null;
  /**
   * Flags without which the screen does not exist. Captured in the flags-on
   * pass only and drawn as a flag-only card.
   */
  requires?: FeatureFlag[];
  /**
   * Flags that replace the screen, for example `recaps` redirects Statistics
   * to Recaps. Captured in the flags-off pass only.
   */
  hiddenBy?: FeatureFlag[];
  /** Candidate flags for flagged UI. Default: every overridable flag. */
  attribute?: FeatureFlag[];
  states: StateSpec[];
}

/**
 * Flags state of one capture. `off`: production default. `on`: every
 * overridable flag. `set`: some flags, to find which flag adds an element.
 */
export type Pass =
  | { kind: "off" }
  | { kind: "on" }
  | { kind: "set"; flags: FeatureFlag[] };

/** Pass name in logs and failure folders: `off`, `on`, or `flags:a+b`. */
export const passId = (pass: Pass) =>
  pass.kind === "set" ? `flags:${pass.flags.join("+")}` : pass.kind;

const extraFlags = (pass: Pass): FeatureFlag[] => {
  if (pass.kind === "on") {
    return OVERRIDABLE_FLAGS;
  }
  return pass.kind === "set" ? pass.flags : [];
};

/** Flags a pass turns on, sorted. Flag-only screens always add `requires`. */
export const passFlags = (screen: ScreenSpec, pass: Pass): FeatureFlag[] =>
  [...new Set([...(screen.requires ?? []), ...extraFlags(pass)])].toSorted();

/** Full state id used in hashes, URLs, and logs: `<screen>/<state>`. */
export const stateKey = (screen: ScreenSpec, state: StateSpec) =>
  `${screen.id}/${state.id}`;

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const checkScreen = (screen: ScreenSpec, fixtureIds: Set<string>) => {
  const problems: string[] = [];
  if (!ID_PATTERN.test(screen.id)) {
    problems.push(`screen "${screen.id}": id must be kebab-case`);
  }
  if (!screen.route.startsWith("/")) {
    problems.push(`screen "${screen.id}": route must start with /`);
  }
  if (screen.states.length === 0) {
    problems.push(`screen "${screen.id}": needs at least one state`);
  }
  if (screen.requires?.length && screen.hiddenBy?.length) {
    problems.push(
      `screen "${screen.id}": requires and hiddenBy exclude each other`
    );
  }
  const flags = [
    ...(screen.requires ?? []),
    ...(screen.hiddenBy ?? []),
    ...(screen.attribute ?? []),
  ];
  for (const flag of flags.filter((key) => !FEATURE_FLAGS.includes(key))) {
    problems.push(`screen "${screen.id}": unknown flag "${flag}"`);
  }
  const stateIds = new Set<string>();
  for (const state of screen.states) {
    const key = `${screen.id}/${state.id}`;
    if (!ID_PATTERN.test(state.id) || stateIds.has(state.id)) {
      problems.push(`state "${key}": id must be unique kebab-case`);
    }
    stateIds.add(state.id);
    if (!fixtureIds.has(state.fixture)) {
      problems.push(`state "${key}": unknown fixture "${state.fixture}"`);
    }
  }
  return problems;
};

const checkTree = (screens: ScreenSpec[]) => {
  const problems: string[] = [];
  const byId = new Map(screens.map((screen) => [screen.id, screen]));
  if (byId.size !== screens.length) {
    problems.push("manifest has duplicate screen ids");
  }
  const roots = screens.filter((screen) => screen.parent === null);
  if (roots.length !== 1) {
    problems.push(
      `manifest needs exactly one root screen, has ${roots.length}`
    );
  }
  for (const screen of screens) {
    const seen = new Set<string>();
    let current: ScreenSpec | undefined = screen;
    while (current?.parent && !seen.has(current.id)) {
      seen.add(current.id);
      const parent = byId.get(current.parent);
      if (!parent) {
        problems.push(
          `screen "${current.id}": unknown parent "${current.parent}"`
        );
      }
      current = parent;
    }
    if (current && seen.has(current.id)) {
      problems.push(`screen "${screen.id}": parent chain has a cycle`);
    }
  }
  return problems;
};

/**
 * Problems in the manifest that need no device: bad or duplicate ids,
 * unknown parents, fixtures, and flags, cycles. Empty when valid.
 */
export const checkManifest = (
  screens: ScreenSpec[],
  fixtureIds: Set<string>
): string[] => [
  ...screens.flatMap((screen) => checkScreen(screen, fixtureIds)),
  ...checkTree(screens),
];

const stepSelector = (step: Step): Selector => {
  if ("press" in step) {
    return step.press;
  }
  return "scroll" in step ? step.until : step.wait;
};

/** Every selector of a screen's states: waits and step targets. */
export const listSelectors = (screen: ScreenSpec): Selector[] =>
  screen.states.flatMap((state) => [
    state.wait,
    ...(state.steps ?? []).map(stepSelector),
  ]);
