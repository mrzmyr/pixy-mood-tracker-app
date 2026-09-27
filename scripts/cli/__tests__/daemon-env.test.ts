import { describe, expect, test } from "bun:test";
import { checkDaemonEnv } from "../daemon-env.ts";

const expected = {
  AGENT_DEVICE_IOS_TEAM_ID: "<team>",
  AGENT_DEVICE_IOS_BUNDLE_ID: "com.example.runner",
};

describe("checkDaemonEnv", () => {
  test("reports missing daemon", () => {
    expect(checkDaemonEnv(expected, null)).toEqual({ kind: "missing" });
  });
  test("reports unreadable environment", () => {
    expect(checkDaemonEnv(expected, "bunx agent-device daemon start")).toEqual({
      kind: "unreadable",
    });
  });
  test("reports current signing environment", () => {
    expect(
      checkDaemonEnv(
        expected,
        "agent-device daemon HOME=/Users/test AGENT_DEVICE_IOS_TEAM_ID=<team> AGENT_DEVICE_IOS_BUNDLE_ID=com.example.runner"
      )
    ).toEqual({ kind: "current" });
  });
  test("reports stale signing environment", () => {
    expect(
      checkDaemonEnv(
        expected,
        "agent-device daemon HOME=/Users/test AGENT_DEVICE_IOS_TEAM_ID=OTHERTEAM1 AGENT_DEVICE_IOS_BUNDLE_ID=com.example.runner"
      )
    ).toMatchObject({ kind: "stale", keys: ["AGENT_DEVICE_IOS_TEAM_ID"] });
  });
});
