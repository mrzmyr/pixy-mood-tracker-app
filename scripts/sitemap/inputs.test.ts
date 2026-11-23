// Input hash decides when a cached screenshot is reused. A file the screen
// shows that does not change the hash serves a stale screenshot. A change
// the screen cannot show that does change it recaptures for nothing.
import fs from "node:fs";
import path from "node:path";

import { describe, expect, test } from "bun:test";
import { z } from "zod";

import { createInputHasher, findRouteFile, REPO_ROOT } from "./inputs.ts";
import type { Source } from "./inputs.ts";
import type { ScreenSpec } from "./manifest.ts";
import type { Variant } from "./profile.ts";

const tracked = Bun.spawnSync(["git", "ls-files"], { cwd: REPO_ROOT })
  .stdout.toString()
  .split("\n")
  .filter(Boolean);

const screen = (id: string, route: string): ScreenSpec => ({
  id,
  title: id,
  route,
  parent: null,
  userData: false,
  states: [{ id: "year", title: id, fixture: "year", wait: 'id="x"' }],
});
const TAGS = screen("tags", "/tags");
const FEATURE_FLAGS = screen("feature-flags", "/settings/feature-flags");
const LICENSES = screen("licenses", "/settings/licenses");

const IOS_LIGHT: Variant = { platform: "ios", appearance: "light" };
const ROUTE_FILE =
  findRouteFile("/tags", new Map(tracked.map((file) => [file, ""]))) ?? "";

/** Edit of one checkout file: its new content from the old. */
interface Edit {
  file: string;
  change: (content: string) => string;
}

const read = (file: string) =>
  fs.readFileSync(path.join(REPO_ROOT, file), "utf-8");

const hasherWith = (edit?: Edit) => {
  const blobs = new Map(
    tracked.map((file): [string, string] => [
      file,
      file === edit?.file ? "changed" : "base",
    ])
  );
  const source: Source = { sha: "sha", blobs, tree: "" };
  return createInputHasher({
    source,
    nativeFingerprint: "native",
    read: (file) =>
      file === edit?.file ? edit.change(read(file)) : read(file),
  });
};

/** Input hash of a screen with one file edited. */
const hashWith = (edit?: Edit, variant = IOS_LIGHT, of = TAGS) =>
  hasherWith(edit)(of, of.states[0], { kind: "off" }, variant);

/** A statement that runs on load: counts wherever the file is reached. */
const runsOnLoad = (file: string): Edit => ({
  file,
  change: (content) => `${content}\nglobalThis.sitemapTest = 1;\n`,
});

const replace = (file: string, from: string | RegExp, to: string): Edit => ({
  file,
  change: (content) => {
    const next = content.replace(from, to);
    expect(next).not.toBe(content);
    return next;
  },
});

const CopyTable = z.record(z.string(), z.json());

/** Sets one translation of a locale file. */
const translate = (file: string, key: string, text: string): Edit => ({
  file,
  change: (content) =>
    JSON.stringify({ ...CopyTable.parse(JSON.parse(content)), [key]: text }),
});

/** Sets the first `"key": "…"` of a JSON file: top-level keys come first. */
const setFirst = (file: string, key: string, value: string) =>
  replace(file, new RegExp(`"${key}": "[^"]+"`, "u"), `"${key}": "${value}"`);

describe("input hash", () => {
  const base = hashWith();

  test("changes with the route file", () => {
    expect(ROUTE_FILE).not.toBe("");
    expect(hashWith(runsOnLoad(ROUTE_FILE))).not.toBe(base);
  });

  test("changes with the calendar the sheet opens over", () => {
    expect(hashWith(runsOnLoad("src/app/(app)/calendar.tsx"))).not.toBe(base);
  });

  test("a pushed screen covers the calendar and ignores it", () => {
    const edit = runsOnLoad("src/app/(app)/calendar.tsx");
    expect(hashWith(edit, IOS_LIGHT, LICENSES)).toBe(
      hashWith(undefined, IOS_LIGHT, LICENSES)
    );
  });

  test("changes with the capture polyfill", () => {
    const edit = runsOnLoad("scripts/sitemap/capture-polyfill.js");
    expect(hashWith(edit)).not.toBe(base);
  });

  test("ignores files the app never loads", () => {
    expect(hashWith(runsOnLoad("README.md"))).toBe(base);
  });

  test("ignores comments", () => {
    const edit = {
      file: ROUTE_FILE,
      change: (code: string) => `// x\n${code}`,
    };
    expect(hashWith(edit)).toBe(base);
  });

  test("ignores an export of a shared module the screen never reads", () => {
    const keys = "src/state/feature-flags/keys.ts";
    const edit = replace(keys, /description: "[^"]+"/u, 'description: "x"');
    expect(hashWith(edit)).toBe(base);
    expect(hashWith(edit, IOS_LIGHT, FEATURE_FLAGS)).not.toBe(
      hashWith(undefined, IOS_LIGHT, FEATURE_FLAGS)
    );
  });

  test("a layout counts only the stack screens of routes on screen", () => {
    const layout = "src/app/(app)/_layout.tsx";
    const edit = (route: string) =>
      replace(
        layout,
        `<Stack.Screen name="${route}" options=`,
        `<Stack.Screen name="${route}" key="x" options=`
      );
    expect(hashWith(edit("settings/orbit"))).toBe(base);
    expect(hashWith(edit("tags/index"))).not.toBe(base);
  });

  test("a developer tool screen no capture opens keeps every hash", () => {
    const edit = runsOnLoad("src/dev/playground.tsx");
    expect(hashWith(edit)).toBe(base);
  });

  test("changes with the text of a translation key the screen names only", () => {
    const { keys } = hasherWith().inputsOf(TAGS, IOS_LIGHT);
    const copy = CopyTable.parse(JSON.parse(read("assets/locales/en.json")));
    const unused = Object.keys(copy).find((key) => !keys.includes(key));
    expect(keys.length).toBeGreaterThan(0);
    expect(unused).toBeDefined();
    const english = (key: string) =>
      translate("assets/locales/en.json", key, "changed");
    expect(hashWith(english(keys[0]))).not.toBe(base);
    expect(hashWith(english(unused ?? ""))).toBe(base);
    const german = translate("assets/locales/de.json", keys[0], "geändert");
    expect(hashWith(german)).toBe(base);
  });

  test("a release version bump keeps every hash", () => {
    expect(hashWith(setFirst("package.json", "version", "999.0.0"))).toBe(base);
    expect(hashWith(setFirst("app.json", "version", "999.0.0"))).toBe(base);
  });

  test("a dev tool bump keeps every hash, a runtime dependency does not", () => {
    expect(hashWith(setFirst("package.json", "oxlint", "999.0.0"))).toBe(base);
    const runtime = setFirst("package.json", "react-native", "999.0.0");
    expect(hashWith(runtime)).not.toBe(base);
  });

  test("changes with the appearance", () => {
    expect(
      hashWith(undefined, { platform: "ios", appearance: "dark" })
    ).not.toBe(base);
  });

  test("an Android driver change keeps iOS hashes", () => {
    const android = { platform: "android", appearance: "light" } as const;
    const edit = runsOnLoad("scripts/sitemap/device-android.ts");
    expect(hashWith(edit)).toBe(base);
    expect(hashWith(edit, android)).not.toBe(hashWith(undefined, android));
  });
});
