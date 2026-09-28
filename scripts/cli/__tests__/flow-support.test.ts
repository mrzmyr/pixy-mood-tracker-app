import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  assertFlowsSupported,
  findBlockedFlows,
  findFixture,
} from "../flow-support.ts";
import { CliError } from "../shared.ts";

let root = "";

const write = (file: string, commands: string) => {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `appId: \${APP_ID}\n---\n${commands}`);
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "pixy-mood-tracker-flows-"));
  write("flows/01-clear.yaml", "- launchApp:\n    clearState: true\n");
  write(
    "flows/02-erase.yaml",
    "- launchApp\n- tapOn:\n    id: name\n- eraseText\n"
  );
  write(
    "flows/03-android-only.yaml",
    [
      "- runFlow:",
      "    when:",
      "      platform: Android",
      "    commands:",
      "      - launchApp:",
      "          clearState: true",
      "- runFlow:",
      "    when:",
      "      platform: iOS",
      "    commands:",
      "      - eraseText",
      "",
    ].join("\n")
  );
  write("flows/04-link.yaml", "- runFlow:\n    file: ../subflows/link.yaml\n");
  write("flows/05-plain.yaml", "- launchApp\n- tapOn: Start\n");
  write(
    "flows/06-fixture.yaml",
    "- runFlow:\n    file: ../subflows/load-fixture.yaml\n    env:\n      FIXTURE: empty\n"
  );
  fs.mkdirSync(path.join(root, "subflows"));
  fs.writeFileSync(
    path.join(root, "subflows/link.yaml"),
    "- openLink: app://dev/fixture?id=seed\n"
  );
  fs.writeFileSync(
    path.join(root, "subflows/load-fixture.yaml"),
    "- launchApp\n- openLink: app://dev/fixture?id=empty\n"
  );
});

afterEach(() => {
  fs.rmSync(root, { force: true, recursive: true });
});

describe("findBlockedFlows", () => {
  test("iPhone blocks clearState and links from subflows", () => {
    const { blocked, flows } = findBlockedFlows(root, "ios", ["flows"]);
    expect(flows).toHaveLength(6);
    expect(blocked.map(({ flow }) => flow)).toEqual([
      "flows/01-clear.yaml",
      "flows/04-link.yaml",
    ]);
    expect(blocked[1].reasons[0]).toContain("issues/2998");
  });

  test("iPhone accepts fixture subflow but blocks another link subflow", () => {
    const { blocked } = findBlockedFlows(root, "ios", ["flows"]);
    expect(blocked.map(({ flow }) => flow)).not.toContain(
      "flows/06-fixture.yaml"
    );
    expect(blocked.map(({ flow }) => flow)).toContain("flows/04-link.yaml");
  });

  test("Android phone blocks eraseText outside iOS-only blocks", () => {
    const { blocked } = findBlockedFlows(root, "android", ["flows"]);
    expect(blocked.map(({ flow }) => flow)).toEqual(["flows/02-erase.yaml"]);
    expect(blocked[0].reasons[0]).toContain("issues/2997");
  });

  test("single file paths are checked as given", () => {
    const { blocked, flows } = findBlockedFlows(root, "ios", [
      "flows/05-plain.yaml",
    ]);
    expect(flows).toEqual(["flows/05-plain.yaml"]);
    expect(blocked).toEqual([]);
  });
});

describe("findFixture", () => {
  test("finds a top-level fixture", () => {
    expect(findFixture(root, "flows/06-fixture.yaml")).toBe("empty");
  });

  test("returns null for a flow without a fixture", () => {
    expect(findFixture(root, "flows/05-plain.yaml")).toBeNull();
  });
});

describe("assertFlowsSupported", () => {
  test("names blocked flows and the commands for both devices", () => {
    let thrown: unknown;
    try {
      assertFlowsSupported(
        root,
        { key: "my-iphone-14-201e", platform: "ios" },
        ["flows"]
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(CliError);
    // SAFETY: the line above fails the test unless `thrown` is a CliError.
    const { fix, message, status, why } = thrown as CliError;
    expect(status).toBe("flows_unsupported_on_phone");
    expect(message).toBe(
      "2 of 6 flows use steps agent-device cannot run on my-iphone-14-201e"
    );
    expect(why).toContain(
      "clearState works on iOS simulators only in agent-device: flows/01-clear.yaml"
    );
    expect(fix).toContain(
      "bun e2e run --platform=ios --paths=flows/01-clear.yaml,flows/04-link.yaml."
    );
    expect(fix).toContain(
      "bun e2e run --target=my-iphone-14-201e --paths=flows/02-erase.yaml,flows/03-android-only.yaml,flows/05-plain.yaml,flows/06-fixture.yaml."
    );
  });

  test("passes when every flow runs on the phone", () => {
    expect(() =>
      assertFlowsSupported(root, { key: "pixel-8-09yw", platform: "android" }, [
        "flows/05-plain.yaml",
      ])
    ).not.toThrow();
  });
});
