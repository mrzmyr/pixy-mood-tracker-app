import { describe, expect, test } from "bun:test";
import {
  findBusyCheckouts,
  selectDerivedData,
  selectIdleBuildFolders,
  selectOldFiles,
  selectSimulators,
  selectStaleBuilds,
} from "../reclaim.ts";

const HOUR = 3_600_000;
const NOW = Date.parse("2026-01-10T12:00:00Z");
const MAIN = "/work/app";
const TREE = "/work/trees/feature";
const GONE = "/work/trees/deleted";
const idle = { busy: new Set<string>(), hasUnknown: false };

const entry = (checkout: string, workspace = "PixyDev", accessedAgo = 5) => ({
  dir: `/dd/${workspace}-${checkout.length}`,
  workspacePath: `${checkout}/ios/${workspace}.xcworkspace`,
  lastAccessedMs: NOW - accessedAgo * HOUR,
});

const hasPath = (target: string) => target !== GONE;

const build = (id: string, variant: string, hoursAgo: number) => ({
  id,
  platform: "ios",
  target: "simulator",
  variant,
  lastUsedAt: new Date(NOW - hoursAgo * HOUR).toISOString(),
});

describe("findBusyCheckouts", () => {
  test("maps build processes to checkouts by command line or working folder", () => {
    const state = findBusyCheckouts(
      [
        {
          command: `xcodebuild -workspace ${TREE}/ios/PixyDev.xcworkspace build`,
        },
        {
          command: "java -cp x org.gradle.wrapper.GradleWrapperMain assemble",
          cwd: `${MAIN}/android`,
        },
        { command: "node metro", cwd: GONE },
      ],
      [MAIN, TREE]
    );
    expect([...state.busy].toSorted()).toEqual([MAIN, TREE]);
    expect(state.hasUnknown).toBe(false);
  });

  test("flags a build process that no known checkout owns", () => {
    const state = findBusyCheckouts(
      [{ command: "/usr/bin/xcodebuild build", cwd: "/elsewhere" }],
      [MAIN]
    );
    expect(state.busy.size).toBe(0);
    expect(state.hasUnknown).toBe(true);
  });

  test("ignores idle Gradle daemons and Xcode build services", () => {
    const state = findBusyCheckouts(
      [
        { command: "java org.gradle.launcher.daemon.bootstrap.GradleDaemon" },
        { command: "/Applications/Xcode.app/XCBBuildService" },
      ],
      [MAIN]
    );
    expect(state).toEqual(idle);
  });
});

describe("selectDerivedData", () => {
  test("selects deleted checkouts and idle ones, keeps busy and recent ones", () => {
    const entries = [
      entry(GONE, "PixyPreview", 0),
      entry(MAIN),
      entry(TREE),
      { ...entry("/work/trees/recent"), lastAccessedMs: NOW - HOUR / 2 },
    ];
    const selected = selectDerivedData(entries, {
      busy: new Set([TREE]),
      hasUnknown: false,
      now: NOW,
      hasPath,
    });
    expect(selected.map((item) => item.workspacePath)).toEqual([
      entries[0].workspacePath,
      entries[1].workspacePath,
    ]);
  });

  test("keeps other Xcode projects and entries without a workspace", () => {
    const selected = selectDerivedData(
      [entry(GONE, "OtherApp"), { dir: "/dd/ModuleCache.noindex" }],
      { ...idle, now: NOW, hasPath }
    );
    expect(selected).toEqual([]);
  });

  test("keeps existing checkouts while an unknown build runs", () => {
    const selected = selectDerivedData([entry(GONE), entry(MAIN)], {
      busy: new Set(),
      hasUnknown: true,
      now: NOW,
      hasPath,
    });
    expect(selected.map((item) => item.reason)).toEqual([
      `checkout deleted: ${GONE}`,
    ]);
  });
});

describe("selectIdleBuildFolders", () => {
  test("returns only ios/build/Build of idle checkouts", () => {
    expect(
      selectIdleBuildFolders([MAIN, TREE], {
        busy: new Set([TREE]),
        hasUnknown: false,
      })
    ).toEqual([`${MAIN}/ios/build/Build`]);
    expect(
      selectIdleBuildFolders([MAIN], { busy: new Set(), hasUnknown: true })
    ).toEqual([]);
  });
});

describe("selectSimulators", () => {
  test("selects shut-down CLI simulators of deleted checkouts only", () => {
    const selected = selectSimulators(
      [
        {
          name: "pixy-mood-tracker-aaaaaaaaaaaa",
          udid: "1",
          state: "Shutdown",
        },
        { name: "pixy-mood-tracker-bbbbbbbbbbbb", udid: "2", state: "Booted" },
        {
          name: "pixy-mood-tracker-cccccccccccc",
          udid: "3",
          state: "Shutdown",
        },
        { name: "pixy-mood-tracker", udid: "4", state: "Shutdown" },
        { name: "iPhone 17 Pro", udid: "5", state: "Shutdown" },
      ],
      new Set(["cccccccccccc"])
    );
    expect(selected.map((simulator) => simulator.udid)).toEqual(["1"]);
  });
});

describe("selectStaleBuilds", () => {
  test("keeps newest per variant and builds used within the age", () => {
    const selected = selectStaleBuilds(
      [
        build("old-release", "Release", 30),
        build("new-release", "Release", 25),
        build("only-debug", "unknown", 100),
        build("recent-release", "Release", 2),
      ],
      NOW,
      24 * HOUR
    );
    expect(selected.map((item) => item.id).toSorted()).toEqual([
      "new-release",
      "old-release",
    ]);
  });
});

describe("selectOldFiles", () => {
  test("selects files written before the age", () => {
    expect(
      selectOldFiles(
        [
          { path: "old.mp4", mtimeMs: NOW - 30 * HOUR },
          { path: "new.mp4", mtimeMs: NOW - HOUR },
        ],
        NOW,
        24 * HOUR
      ).map((file) => file.path)
    ).toEqual(["old.mp4"]);
  });
});
