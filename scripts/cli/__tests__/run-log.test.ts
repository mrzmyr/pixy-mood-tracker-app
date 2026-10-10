import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import {
  RUN_LOGS_KEPT,
  finishRunLog,
  formatResultLine,
  formatRunLogName,
  formatStepLine,
  selectLogsToPrune,
  setResultPath,
  startRunLog,
  step,
} from "../run-log.ts";

// Parse `PIXY_RESULT key=value ...` the way a shell or agent would.
const parseResult = (line: string) => {
  const [marker, ...pairs] = line.match(/(?:[^\s"]+|"[^"]*")+/gu) ?? [];
  return {
    marker,
    fields: Object.fromEntries(
      pairs.map((pair) => {
        const separator = pair.indexOf("=");
        const key = pair.slice(0, separator);
        const value = pair.slice(separator + 1);
        return [key, value.startsWith('"') ? JSON.parse(value) : value];
      })
    ),
  };
};

// Silence terminal output of the run log while keeping file writes.
const quietly = (work: () => void) => {
  const { stdout, stderr } = process;
  const out = stdout.write;
  const err = stderr.write;
  stdout.write = () => true;
  stderr.write = () => true;
  try {
    work();
  } finally {
    stdout.write = out;
    stderr.write = err;
  }
};

describe("result line", () => {
  test("failure keeps the CliError status and artifact path parseable", () => {
    const line = formatResultLine({
      status: "error",
      command: "e2e-run",
      code: "e2e_failed",
      path: "/tmp/run artifacts/ios",
    });
    expect(parseResult(line)).toEqual({
      marker: "PIXY_RESULT",
      fields: {
        status: "error",
        command: "e2e-run",
        code: "e2e_failed",
        path: "/tmp/run artifacts/ios",
      },
    });
  });

  test("success omits code and path when absent", () => {
    expect(
      parseResult(formatResultLine({ status: "ok", command: "app-install" }))
        .fields
    ).toEqual({ status: "ok", command: "app-install" });
  });
});

describe("step line", () => {
  test("numbers by position in the declared steps, also after skipped ones", () => {
    const steps = ["Resolve device", "Fingerprint", "Build"];
    expect(formatStepLine(steps, "Build")).toBe("Step 3/3: Build");
    expect(formatStepLine(steps, "Upload")).toBe("Step: Upload");
  });
});

describe("run log files", () => {
  test("two runs of one command in one second get different files", () => {
    const at = new Date("2026-10-05T10:11:12.345Z");
    const first = formatRunLogName("app-install", at, 100);
    expect(first).not.toBe(formatRunLogName("app-install", at, 101));
    expect(first).toMatch(/^app-install-\d{8}T\d{6}Z-100\.log$/u);
  });

  test("prune keeps the newest logs", () => {
    const logs = [
      { name: "a.log", mtimeMs: 1 },
      { name: "c.log", mtimeMs: 3 },
      { name: "b.log", mtimeMs: 2 },
    ];
    expect(selectLogsToPrune(logs, 2)).toEqual(["a.log"]);
    expect(selectLogsToPrune(logs, 5)).toEqual([]);
  });

  test("log starts with its path and ends with the result line", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pixy-run-log-"));
    for (let index = 0; index < RUN_LOGS_KEPT + 2; index += 1) {
      fs.writeFileSync(path.join(dir, `old-${index}.log`), "");
    }
    let file = "";
    quietly(() => {
      file = startRunLog({
        dir,
        command: "app-build",
        steps: ["Resolve device", "Fingerprint", "Build"],
      });
      step("Build");
      setResultPath("/cache/build.app");
      finishRunLog("app-build", { status: "native_build_failed" });
    });
    const lines = fs.readFileSync(file, "utf-8").trimEnd().split("\n");
    expect(lines[0]).toBe(`Log: ${file}`);
    expect(lines).toContain("Step 3/3: Build");
    expect(lines.at(-1)).toBe(
      "PIXY_RESULT status=error command=app-build code=native_build_failed path=/cache/build.app"
    );
    expect(fs.readdirSync(dir)).toHaveLength(RUN_LOGS_KEPT);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
