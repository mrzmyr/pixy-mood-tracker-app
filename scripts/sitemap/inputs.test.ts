// Input hash decides when a cached screenshot is reused. A file the screen
// shows that does not change the hash serves a stale screenshot.
import { describe, expect, test } from "bun:test";

import { createInputHasher, findRouteFile, REPO_ROOT } from "./inputs.ts";
import type { Source } from "./inputs.ts";
import type { ScreenSpec } from "./manifest.ts";

const tracked = Bun.spawnSync(["git", "ls-files"], { cwd: REPO_ROOT })
  .stdout.toString()
  .split("\n")
  .filter(Boolean);

const TAGS: ScreenSpec = {
  id: "tags",
  title: "Tags",
  route: "/tags",
  parent: null,
  states: [{ id: "year", title: "Tags", fixture: "year", wait: 'id="x"' }],
};

/** Input hash of the tags screen with one file's blob changed. */
const hashWith = (changed?: string) => {
  const blobs = new Map(
    tracked.map((file): [string, string] => [
      file,
      file === changed ? "changed" : "base",
    ])
  );
  const source: Source = {
    sha: "sha",
    subject: "",
    date: "",
    isDeployable: false,
    blobs,
    tree: "",
  };
  const hash = createInputHasher({ source, nativeFingerprint: "native" });
  return hash(TAGS, TAGS.states[0], { kind: "off" });
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
});
