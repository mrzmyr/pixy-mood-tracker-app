import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { getStartTime, isHolderAlive, withLock } from "../build-lock.ts";
import type { LockHolder, LockOptions } from "../build-lock.ts";
import { CliError } from "../shared.ts";

let dir = "";
let file = "";

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "build-lock-"));
  file = path.join(dir, "ios-build.lock");
});

afterEach(() => {
  fs.rmSync(dir, { force: true, recursive: true });
});

// Holders in one test process differ by a fake PID; `isAlive` decides who
// counts as running.
const options = (pid: number, overrides: Partial<LockOptions> = {}) => ({
  holder: { command: `run ${pid}`, pid, startedAt: "start" },
  isAlive: () => true,
  onWait: () => {},
  pollMs: 5,
  ...overrides,
});

const writeLock = (holder: LockHolder) =>
  fs.writeFileSync(file, `${JSON.stringify(holder)}\n`);

// Work that runs until the test emits "finish".
const blockingWork =
  (gate: EventTarget, events: string[], name: string) => async () => {
    events.push(`${name} start`);
    await once(gate, "finish");
    events.push(`${name} end`);
  };

describe("withLock", () => {
  it("makes a second run wait until the first releases the lock", async () => {
    const events: string[] = [];
    const gate = new EventTarget();
    const waitedFor: number[] = [];
    const first = withLock(
      file,
      blockingWork(gate, events, "first"),
      options(1)
    );
    const second = withLock(
      file,
      () => {
        events.push("second start");
        return Promise.resolve();
      },
      options(2, { onWait: (holder) => waitedFor.push(holder.pid) })
    );

    await sleep(50);
    expect(events).toEqual(["first start"]);
    expect(waitedFor).toEqual([1]);

    gate.dispatchEvent(new Event("finish"));
    await Promise.all([first, second]);
    expect(events).toEqual(["first start", "first end", "second start"]);
    expect(fs.existsSync(file)).toBe(false);
  });

  it("takes over a lock whose holder is dead", async () => {
    writeLock({ command: "crashed", pid: 1, startedAt: "start" });

    await expect(
      withLock(
        file,
        () => Promise.resolve("built"),
        options(2, { isAlive: () => false })
      )
    ).resolves.toBe("built");
  });

  it("takes over a lock with unreadable content", async () => {
    fs.writeFileSync(file, "");

    await expect(
      withLock(file, () => Promise.resolve("built"), options(2))
    ).resolves.toBe("built");
  });

  it("releases the lock when the work throws", async () => {
    const failure = new CliError({
      fix: "Fix the build.",
      message: "compile failed",
      status: "native_build_failed",
      why: "Test failure.",
    });

    await expect(
      withLock(file, () => Promise.reject(failure), options(1))
    ).rejects.toThrow("compile failed");
    expect(fs.existsSync(file)).toBe(false);
  });

  it("does not block other platforms", async () => {
    const gate = new EventTarget();
    const ios = withLock(file, blockingWork(gate, [], "ios"), options(1));

    await expect(
      withLock(
        path.join(dir, "android-build.lock"),
        () => Promise.resolve("built"),
        options(2)
      )
    ).resolves.toBe("built");
    gate.dispatchEvent(new Event("finish"));
    await ios;
  });

  it("keeps a lock that another run took after this run's work", async () => {
    await withLock(
      file,
      () => {
        writeLock({ command: "other", pid: 3, startedAt: "start" });
        return Promise.resolve();
      },
      options(1)
    );

    expect(fs.existsSync(file)).toBe(true);
  });
});

describe("isHolderAlive", () => {
  it("is true for a running process and false once it is killed", async () => {
    const child = spawn("sleep", ["30"]);
    const pid = child.pid ?? 0;
    const holder = { command: "sleep", pid, startedAt: getStartTime(pid) };

    expect(isHolderAlive(holder)).toBe(true);
    child.kill("SIGKILL");
    await once(child, "exit");
    expect(isHolderAlive(holder)).toBe(false);
  });

  it("is false when the PID now belongs to another process", () => {
    expect(
      isHolderAlive({
        command: "old run",
        pid: process.pid,
        startedAt: "Thu Jan  1 00:00:00 1970",
      })
    ).toBe(false);
  });
});
