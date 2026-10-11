import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { lintFlows } from "../flow-lint.ts";
import { readKnownFailures } from "../known-failures.ts";

const repoRoot = path.resolve(import.meta.dir, "../../..");
let root = "";

const write = (file: string, content: string) => {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "pixy-mood-tracker-lint-"));
  write(
    "src/Calendar.tsx",
    [
      "export const Calendar = ({ testID }: { testID?: string }) => (",
      '  <View testID="calendar-list" title="calendar">',
      `    <Day testID={\`calendar-day-\${date}\`} />`,
      "    <Row testID={testID} />",
      `    <Tile testID={\`\${testID}-\${name}\`} />`,
      '    <Header editTestID={isOpen ? "header-close" : "header-open"} />',
      "  </View>",
      ");",
    ].join("\n")
  );
});

afterEach(() => {
  fs.rmSync(root, { force: true, recursive: true });
});

describe("lintFlows", () => {
  test("repository flows reference existing files and testIDs", () => {
    expect(lintFlows(repoRoot)).toEqual([]);
  });

  test("known failures name existing flows", () => {
    const missing = readKnownFailures(repoRoot)
      .map(({ flow }) => flow)
      .filter((flow) => !fs.existsSync(path.join(repoRoot, flow)));
    expect(missing).toEqual([]);
  });

  test("resolves subflow paths from the calling file, also when nested", () => {
    write(
      "e2e/flows/a.yaml",
      "appId: x\n---\n- runFlow: ../subflows/outer.yaml\n- runScript: ../scripts/date.js\n"
    );
    write(
      "e2e/subflows/outer.yaml",
      "- runFlow:\n    when:\n      platform: iOS\n    commands:\n      - runFlow: inner.yaml\n      - runFlow:\n          file: removed.yaml\n"
    );
    write("e2e/subflows/inner.yaml", "- back\n");
    expect(lintFlows(root).map(({ message }) => message)).toEqual([
      "e2e/flows/a.yaml references missing file ../scripts/date.js",
      "e2e/subflows/outer.yaml references missing file removed.yaml",
    ]);
  });

  test("matches ids against literal and template testIDs only", () => {
    write(
      "e2e/flows/a.yaml",
      [
        "appId: x",
        "---",
        "- tapOn:",
        '    id: "calendar-list"',
        "- tapOn:",
        `    id: "calendar-day-\${output.today}"`,
        "- tapOn:",
        '    id: "calendar-day-2026-01-01"',
        "- tapOn:",
        '    id: "header-close"',
        "- runFlow:",
        "    file: ../subflows/b.yaml",
        "    env:",
        '      id: "not-a-selector"',
        "- tapOn:",
        '    id: "calendar"',
        "- tapOn:",
        '    id: "anything-else"',
        "",
      ].join("\n")
    );
    write("e2e/subflows/b.yaml", "- back\n");
    const issues = lintFlows(root);
    expect(issues.map(({ status }) => status)).toEqual([
      "flow_test_id_unknown",
      "flow_test_id_unknown",
    ]);
    expect(issues[0].message).toContain('"calendar"');
    expect(issues[1].message).toContain('"anything-else"');
  });
});
