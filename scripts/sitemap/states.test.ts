// Static checks of the sitemap state list: a renamed testID, route, string,
// or fixture fails here instead of in a 20-minute capture run.
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

import { FIXTURES } from "../../src/dev/fixtures/index.ts";
import { collectTestIdPatterns } from "../cli/flow-lint.ts";
import { findRouteFile, REPO_ROOT } from "./inputs.ts";
import { checkManifest, listSelectors } from "./manifest.ts";
import { SCREENS } from "./states.ts";

const trackedFiles = new Map<string, string>(
  Bun.spawnSync(["git", "ls-files"], { cwd: REPO_ROOT })
    .stdout.toString()
    .split("\n")
    .filter(Boolean)
    .map((file): [string, string] => [file, ""])
);
const testIds = collectTestIdPatterns(path.join(REPO_ROOT, "src"));
const english = new Set(
  Object.values(
    // SAFETY: en.json is a flat key-to-string map; check:locales enforces it.
    JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, "assets/locales/en.json"), "utf-8")
    ) as Record<string, string>
  )
);

describe("sitemap states", () => {
  test("manifest is consistent", () => {
    expect(
      checkManifest(SCREENS, new Set(FIXTURES.map((fixture) => fixture.id)))
    ).toEqual([]);
  });

  test("every route has a route file", () => {
    const missing = SCREENS.flatMap((screen) =>
      findRouteFile(decodeURIComponent(screen.route), trackedFiles) === null
        ? [screen.route]
        : []
    );
    expect(missing).toEqual([]);
  });

  test("every id selector is a testID in src and every text selector an English string", () => {
    const unknown = SCREENS.flatMap((screen) =>
      listSelectors(screen).flatMap((selector) => {
        const id = /\bid="(?<value>[^"]+)"/u.exec(selector)?.groups?.value;
        const text = /\b(?:text|label)="(?<value>[^"]+)"/u.exec(selector)
          ?.groups?.value;
        if (id !== undefined && !testIds.some((pattern) => pattern.test(id))) {
          return [`${screen.id}: id "${id}"`];
        }
        if (id === undefined && text !== undefined && !english.has(text)) {
          return [`${screen.id}: text "${text}"`];
        }
        if (id === undefined && text === undefined) {
          return [
            `${screen.id}: selector ${selector} has no id, text, or label`,
          ];
        }
        return [];
      })
    );
    expect(unknown).toEqual([]);
  });
});
