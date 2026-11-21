// Input hash decides when a cached screenshot is reused. A file the screen
// shows that does not change the hash serves a stale screenshot.
import { describe, expect, test } from "bun:test";

import { createInputHasher, findRouteFile, REPO_ROOT } from "./inputs.ts";
import type { Source } from "./inputs.ts";
import type { ScreenSpec } from "./manifest.ts";
import type { Variant } from "./profile.ts";

const tracked = Bun.spawnSync(["git", "ls-files"], { cwd: REPO_ROOT })
  .stdout.toString()
  .split("\n")
  .filter(Boolean);

const TAGS: ScreenSpec = {
  id: "tags",
  title: "Tags",
  route: "/tags",
  parent: null,
  userData: true,
  states: [{ id: "year", title: "Tags", fixture: "year", wait: 'id="x"' }],
};

/** Input hash of the tags screen with one file's blob changed. */
const IOS_LIGHT: Variant = { platform: "ios", appearance: "light" };

const hashWith = (changed?: string, variant = IOS_LIGHT) => {
  const blobs = new Map(
    tracked.map((file): [string, string] => [
      file,
      file === changed ? "changed" : "base",
    ])
  );
  const source: Source = { sha: "sha", blobs, tree: "" };
  const hash = createInputHasher({ source, nativeFingerprint: "native" });
  return hash(TAGS, TAGS.states[0], { kind: "off" }, variant);
};

describe("input hash", () => {
  const base = hashWith();

  test("changes with the route file", () => {
    const routeFile = findRouteFile(
      "/tags",
      new Map(tracked.map((f) => [f, ""]))
    );
    expect(routeFile).not.toBeNull();
    expect(hashWith(routeFile ?? "")).not.toBe(base);
  });

  test("changes with the calendar the sheet opens over", () => {
    expect(hashWith("src/app/(app)/calendar.tsx")).not.toBe(base);
  });

  test("changes with the capture polyfill", () => {
    expect(hashWith("scripts/sitemap/capture-polyfill.js")).not.toBe(base);
  });

  test("ignores files the app never loads", () => {
    expect(hashWith("README.md")).toBe(base);
  });

  test("changes with the appearance", () => {
    expect(
      hashWith(undefined, { platform: "ios", appearance: "dark" })
    ).not.toBe(base);
  });

  test("an Android driver change keeps iOS hashes", () => {
    const android = { platform: "android", appearance: "light" } as const;
    const file = "scripts/sitemap/device-android.ts";
    expect(hashWith(file)).toBe(base);
    expect(hashWith(file, android)).not.toBe(hashWith(undefined, android));
  });
});
