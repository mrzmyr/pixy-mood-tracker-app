import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  readFailedFlows,
  readKnownFailures,
  toFailedFlowsError,
} from "../known-failures.ts";
import { CliError } from "../shared.ts";

let root = "";

const testcase = (flow: string, failure: string) =>
  `<testcase classname="x" name="${path.basename(flow)}" file="${path.join(root, flow)}" time="1">${failure}</testcase>`;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "pixy-mood-tracker-known-"));
  fs.mkdirSync(path.join(root, "e2e"));
});

afterEach(() => {
  fs.rmSync(root, { force: true, recursive: true });
});

describe("readFailedFlows", () => {
  test("lists failed flows relative to the repository", () => {
    const junit = path.join(root, "junit.xml");
    fs.writeFileSync(
      junit,
      [
        "<testsuites><testsuite>",
        testcase("e2e/flows/a.yaml", "<system-out>status: passed</system-out>"),
        testcase(
          "e2e/flows/b.yaml",
          '<failure message="Replay failed at step 3 (tapOn &quot;x&quot;)">x</failure>'
        ),
        testcase("e2e/flows/c.yaml", '<error message="crash" />'),
        "</testsuite></testsuites>",
      ].join("\n")
    );
    expect(readFailedFlows(root, junit)).toEqual([
      "e2e/flows/b.yaml",
      "e2e/flows/c.yaml",
    ]);
  });
});

describe("toFailedFlowsError", () => {
  const known = [
    {
      flow: "e2e/flows/b.yaml",
      reason: "Android picker differs",
      since: "2026-10-01",
    },
  ];

  test("names new failures apart from known ones and retries only new", () => {
    const error = toFailedFlowsError({
      failed: ["e2e/flows/a.yaml", "e2e/flows/b.yaml"],
      known,
      total: 5,
      retry: "bun e2e run --platform=ios --paths=",
      artifactsDir: "/tmp/e2e",
    });
    expect(error.status).toBe("e2e_failed");
    expect(error.message).toBe("2 of 5 flows failed (1 new, 1 known)");
    expect(error.why).toContain("New: e2e/flows/a.yaml.");
    expect(error.why).toContain(
      "e2e/flows/b.yaml since 2026-10-01: Android picker differs"
    );
    expect(error.fix).toContain(
      "bun e2e run --platform=ios --paths=e2e/flows/a.yaml."
    );
  });

  test("says when every failure is known", () => {
    const error = toFailedFlowsError({
      failed: ["e2e/flows/b.yaml"],
      known,
      retry: "bun e2e run --platform=ios --paths=",
      artifactsDir: "/tmp/e2e",
    });
    expect(error.message).toBe("1 flows failed (0 new, 1 known)");
    expect(error.fix).toStartWith("Only known failures.");
  });
});

describe("readKnownFailures", () => {
  test("rejects entries without a reason", () => {
    fs.writeFileSync(
      path.join(root, "e2e/known-failures.json"),
      JSON.stringify([{ flow: "e2e/flows/a.yaml", since: "2026-10-01" }])
    );
    let thrown: unknown;
    try {
      readKnownFailures(root);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(CliError);
    // SAFETY: the line above fails the test unless `thrown` is a CliError.
    expect((thrown as CliError).status).toBe("known_failures_invalid");
  });
});
