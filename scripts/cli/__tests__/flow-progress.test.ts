import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";

import { createProgressReader, formatStep } from "../flow-progress.ts";

const event = {
  type: "replay_action_stop",
  replayPath: "/abs/e2e/flows/first-launch.yaml",
  line: 8,
  step: 3,
  command: "tapOn",
  ok: true,
  durationMs: 1828,
};

describe("formatStep", () => {
  test("prints a finished step", () => {
    expect(formatStep(JSON.stringify(event))).toBe(
      "  first-launch.yaml #3 tapOn ok 1828ms"
    );
  });

  test("prints a failed step with its error code", () => {
    expect(
      formatStep(
        JSON.stringify({ ...event, ok: false, errorCode: "COMMAND_FAILED" })
      )
    ).toContain("FAIL COMMAND_FAILED");
  });

  test("ignores starts and invalid JSON", () => {
    expect(
      formatStep(JSON.stringify({ ...event, type: "replay_action_start" }))
    ).toBeNull();
    expect(formatStep("not json")).toBeNull();
    expect(formatStep("")).toBeNull();
  });
});

let root = "";

afterEach(() => {
  if (root) {
    fs.rmSync(root, { recursive: true, force: true });
    root = "";
  }
});

describe("createProgressReader", () => {
  test("skips old logs and reads new complete lines once", () => {
    root = fs.mkdtempSync(
      path.join(os.tmpdir(), "pixy-mood-tracker-progress-")
    );
    const oldFile = path.join(root, "old", "replay-timing.ndjson");
    fs.mkdirSync(path.dirname(oldFile), { recursive: true });
    fs.writeFileSync(oldFile, `${JSON.stringify(event)}\n`);

    const lines: string[] = [];
    const reader = createProgressReader(root, (line) => lines.push(line));
    reader.poll();
    expect(lines).toEqual([]);

    const newFile = path.join(root, "new", "replay-timing.ndjson");
    fs.mkdirSync(path.dirname(newFile), { recursive: true });
    fs.writeFileSync(
      newFile,
      `${JSON.stringify(event)}\n${JSON.stringify(event)}\n`
    );
    reader.poll();
    expect(lines).toHaveLength(2);
    reader.poll();
    expect(lines).toHaveLength(2);

    fs.appendFileSync(newFile, JSON.stringify(event));
    reader.poll();
    expect(lines).toHaveLength(2);
    fs.appendFileSync(newFile, "\n");
    reader.poll();
    expect(lines).toHaveLength(3);
  });
});
