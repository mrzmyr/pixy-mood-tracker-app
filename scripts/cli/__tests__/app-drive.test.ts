import { describe, expect, test } from "bun:test";
import { AGENT_DEVICE, STATE_DIR } from "../agent-device.ts";
import { buildDriveCommand } from "../app-drive.ts";
import { CliError } from "../shared.ts";

const statusOf = (action: () => void) => {
  try {
    action();
  } catch (error) {
    return error instanceof CliError ? error.status : "not_cli_error";
  }
  return "no_error";
};

const statusFor = (args: string[]) =>
  statusOf(() =>
    buildDriveCommand({
      device: { platform: "ios", id: "SIM-1" },
      args,
      env: {},
    })
  );

describe("buildDriveCommand", () => {
  test("passes args unchanged and pins the simulator in the default session", () => {
    const args = ["press", 'label="Save entry"', "--settle"];
    const { argv } = buildDriveCommand({
      device: { platform: "ios", id: "SIM-1" },
      args,
      env: {},
    });
    expect(argv).toEqual([
      AGENT_DEVICE,
      ...args,
      "--platform",
      "ios",
      "--udid",
      "SIM-1",
    ]);
  });

  test("pins an Android phone by serial in its own session", () => {
    const { argv } = buildDriveCommand({
      device: {
        platform: "android",
        id: "SERIAL-1",
        session: "pixel-8-al-1",
      },
      args: ["snapshot", "-i"],
      env: {},
    });
    expect(argv.slice(3)).toEqual([
      "--platform",
      "android",
      "--serial",
      "SERIAL-1",
      "--session",
      "pixel-8-al-1",
    ]);
  });

  test("defaults the state dir and keeps caller environment", () => {
    const device = { platform: "ios" as const, id: "SIM-1" };
    const defaulted = buildDriveCommand({
      device,
      args: ["snapshot"],
      env: { AGENT_DEVICE_IOS_TEAM_ID: "TEAM" },
    }).env;
    expect(defaulted.AGENT_DEVICE_STATE_DIR).toBe(STATE_DIR);
    expect(defaulted.AGENT_DEVICE_IOS_TEAM_ID).toBe("TEAM");
    const custom = buildDriveCommand({
      device,
      args: ["snapshot"],
      env: { AGENT_DEVICE_STATE_DIR: "/custom" },
    }).env;
    expect(custom.AGENT_DEVICE_STATE_DIR).toBe("/custom");
  });

  test("rejects empty args and args that select a device", () => {
    expect(statusFor([])).toBe("missing_argument");
    expect(statusFor(["snapshot", "--udid", "OTHER"])).toBe(
      "conflicting_options"
    );
    expect(statusFor(["snapshot", "--session=other"])).toBe(
      "conflicting_options"
    );
    expect(statusFor(["fill", "@e3", "--sessions"])).toBe("no_error");
  });
});
