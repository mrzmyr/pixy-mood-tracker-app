import type { Claim } from "../agent-device.ts";
import {
  checkDaemonEnv,
  findDaemonHolders,
  readPsEnv,
  staleDaemonError,
} from "../daemon-env.ts";
import { CliError } from "../shared.ts";

// Fake values only.
const TEAM = "ABCDE12345";
const BUNDLE = "com.example.agentdevice";
const COMMAND =
  "/usr/local/bin/node /repo/node_modules/agent-device/dist/src/internal/daemon.js";

// `ps eww -o command=` output: the command, then NAME=value pairs.
const ps = (env: Record<string, string>) =>
  [
    COMMAND,
    "HOME=/Users/example",
    ...Object.entries(env).map(([key, value]) => `${key}=${value}`),
  ].join(" ");

const expected = {
  AGENT_DEVICE_IOS_BUNDLE_ID: BUNDLE,
  AGENT_DEVICE_IOS_TEAM_ID: TEAM,
};

const claim = (classification: string, session: string): Claim => ({
  classification,
  device: { id: "fake-udid", kind: "device", name: "Phone", platform: "ios" },
  owner: {
    pid: 4242,
    session,
    startTime: "2026-01-01T00:00:00.000Z",
    workspace: "/tmp/other-worktree",
  },
});

describe("readPsEnv", () => {
  test("reads a value between other variables", () => {
    expect(
      readPsEnv(
        ps({ AGENT_DEVICE_IOS_TEAM_ID: TEAM, PATH: "/bin" }),
        "AGENT_DEVICE_IOS_TEAM_ID"
      )
    ).toBe(TEAM);
  });

  test("does not match a longer name with the same suffix", () => {
    expect(
      readPsEnv(
        ps({ MY_AGENT_DEVICE_IOS_TEAM_ID: TEAM }),
        "AGENT_DEVICE_IOS_TEAM_ID"
      )
    ).toBeUndefined();
  });

  test("returns an empty value", () => {
    expect(
      readPsEnv(
        ps({ AGENT_DEVICE_IOS_TEAM_ID: "" }),
        "AGENT_DEVICE_IOS_TEAM_ID"
      )
    ).toBe("");
  });
});

describe("checkDaemonEnv", () => {
  test("no daemon when ps prints nothing", () => {
    expect(checkDaemonEnv(expected, null)).toEqual({ kind: "missing" });
  });

  test("no daemon when the PID belongs to another process", () => {
    expect(
      checkDaemonEnv(expected, "/usr/bin/vim HOME=/Users/example")
    ).toEqual({ kind: "missing" });
  });

  test("unreadable when ps shows no environment", () => {
    expect(checkDaemonEnv(expected, COMMAND)).toEqual({ kind: "unreadable" });
  });

  test("current when the daemon has the same values", () => {
    expect(
      checkDaemonEnv(
        expected,
        ps({
          AGENT_DEVICE_IOS_BUNDLE_ID: BUNDLE,
          AGENT_DEVICE_IOS_TEAM_ID: TEAM,
        })
      )
    ).toEqual({ kind: "current" });
  });

  test("stale when a raw agent-device call started the daemon", () => {
    expect(checkDaemonEnv(expected, ps({}))).toEqual({
      keys: ["AGENT_DEVICE_IOS_TEAM_ID", "AGENT_DEVICE_IOS_BUNDLE_ID"],
      kind: "stale",
    });
  });

  test("stale when the daemon has another team", () => {
    expect(
      checkDaemonEnv(
        expected,
        ps({
          AGENT_DEVICE_IOS_BUNDLE_ID: BUNDLE,
          AGENT_DEVICE_IOS_TEAM_ID: "ZZZZZ99999",
        })
      )
    ).toEqual({ keys: ["AGENT_DEVICE_IOS_TEAM_ID"], kind: "stale" });
  });

  test("current when the CLI derives no team", () => {
    expect(checkDaemonEnv({}, ps({}))).toEqual({ kind: "current" });
  });
});

describe("findDaemonHolders", () => {
  test("keeps live claims only", () => {
    const live = claim("live", "default");
    expect(findDaemonHolders([claim("stale", "old"), live])).toEqual([live]);
  });
});

describe("staleDaemonError", () => {
  test("names the owners and the commands to run", () => {
    const error = staleDaemonError(
      ["AGENT_DEVICE_IOS_TEAM_ID"],
      [claim("live", "default")],
      "bunx agent-device daemon stop --state-dir ~/.agent-device"
    );
    expect(error).toBeInstanceOf(CliError);
    expect(error.status).toBe("agent_device_daemon_env_stale");
    expect(error.why).toContain("default from /tmp/other-worktree (PID 4242)");
    expect(error.fix).toContain("`bunx agent-device close --session default`");
    expect(error.fix).toContain(
      "`bunx agent-device daemon stop --state-dir ~/.agent-device`"
    );
  });
});
