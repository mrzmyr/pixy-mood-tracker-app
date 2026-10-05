import { describe, expect, test } from "bun:test";
import { probeDeviceService } from "../doctor.ts";
import { CliError } from "../shared.ts";

const statusOf = (action: () => void) => {
  try {
    action();
  } catch (error) {
    return error instanceof CliError ? error.status : "not_cli_error";
  }
  return "no_error";
};

describe("probeDeviceService", () => {
  test("reports a hang as wedged and never restarts the service", () => {
    expect(
      statusOf(() =>
        probeDeviceService({ command: "sleep", args: ["5"], timeoutMs: 200 })
      )
    ).toBe("core_device_service_wedged");
  });

  test("reports a failing probe apart from a hang", () => {
    expect(
      statusOf(() => probeDeviceService({ command: "false", args: [] }))
    ).toBe("devicectl_failed");
  });

  test("passes when the probe exits in time", () => {
    expect(
      statusOf(() => probeDeviceService({ command: "true", args: [] }))
    ).toBe("no_error");
  });
});
