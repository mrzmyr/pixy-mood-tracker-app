// agent-device reporter for `bun e2e run`: writes run.json into the suite's
// artifacts directory, so `bun dashboard` can show which worktree tested which
// device, each flow's status, and its recording. agent-device keeps the rest
// (replay.ad, result.txt, failure.txt, recording.mp4) next to it.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const git = (args) => {
  try {
    return execFileSync("git", args, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
};

const processStartTime = (pid) => {
  try {
    return execFileSync("ps", ["-o", "lstart=", "-p", String(pid)], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
};

// The CLI process runs the reporter, so argv holds the device selectors.
const readFlag = (names) => {
  const index = process.argv.findIndex((arg) => names.includes(arg));
  return index === -1 ? null : (process.argv[index + 1] ?? null);
};

const STATUS = { fail: "failed", pass: "passed", skip: "skipped" };

/**
 * Creates the reporter. agent-device calls the hooks synchronously while the
 * suite runs, so every write is synchronous too.
 */
export default function createReporter() {
  const run = {
    branch:
      git(["branch", "--show-current"]) ||
      git(["rev-parse", "--short", "HEAD"]),
    deviceId:
      readFlag(["--udid", "--serial"]) ?? readFlag(["--device"]) ?? null,
    finishedAt: null,
    flows: [],
    id: "",
    pid: process.pid,
    // PIDs get reused; the start time ties the run to this exact process.
    pidStartedAt: processStartTime(process.pid),
    platform: readFlag(["--platform"]),
    startedAt: new Date().toISOString(),
    status: "running",
    worktree: git(["rev-parse", "--show-toplevel"]) || process.cwd(),
  };
  let file = null;
  const save = () => {
    if (!file) {
      return;
    }
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(run, null, 2)}\n`);
    fs.renameSync(tmp, file);
  };
  const findFlow = (test) => {
    const flowFile = path.relative(run.worktree, test.file);
    let flow = run.flows.find((candidate) => candidate.file === flowFile);
    if (!flow) {
      flow = {
        artifactsDir: path.relative(path.dirname(file), test.artifactsDir),
        attempts: 0,
        durationMs: null,
        file: flowFile,
        message: null,
        status: "pending",
        video: null,
      };
      run.flows.push(flow);
    }
    return flow;
  };

  return {
    name: "pixy-mood-tracker-run",
    onSuiteStart(suite) {
      file = path.join(suite.artifactsDir, "run.json");
      run.id = path.basename(suite.artifactsDir);
      save();
    },
    onTestStart(test) {
      const flow = findFlow(test);
      flow.status = "running";
      save();
    },
    onTestResult(test) {
      const flow = findFlow(test);
      const video = path.join(
        test.artifactsDir,
        `attempt-${test.attempt}`,
        "recording.mp4"
      );
      Object.assign(flow, {
        attempts: test.attempt ?? flow.attempts,
        durationMs: test.durationMs ?? null,
        message: test.message ?? null,
        status: STATUS[test.status] ?? test.status,
        video: fs.existsSync(video)
          ? path.relative(path.dirname(file), video)
          : flow.video,
      });
      save();
    },
    onSuiteEnd(suite) {
      Object.assign(run, {
        finishedAt: new Date().toISOString(),
        status: suite.failed > 0 ? "failed" : "passed",
      });
      save();
    },
  };
}
