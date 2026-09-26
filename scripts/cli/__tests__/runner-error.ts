import { isRunnerStartFailure } from "../runner-error.ts";
import { CliError } from "../shared.ts";

// Errors shaped like `agentDevice` throws them: status is agent-device's code
// in lowercase, why carries its reason and log path.
const agentDeviceError = (
  message: string,
  why = "",
  status = "command_failed"
) => new CliError({ fix: "hint", message, status, why });

describe("isRunnerStartFailure", () => {
  it.each([
    [
      "runner build fails on signing",
      agentDeviceError(
        "xcodebuild build-for-testing failed",
        "Reason: signing_provisioning_profile_missing. Log: /tmp/runner.log"
      ),
    ],
    [
      "runner build fails without a classified reason",
      agentDeviceError(
        "xcodebuild build-for-testing failed",
        "Reason: build_failed_unclassified."
      ),
    ],
    [
      "xcodebuild exits before the runner connects",
      agentDeviceError(
        "Runner did not accept connection (xcodebuild exited early)",
        "Log: /tmp/runner.log"
      ),
    ],
    [
      "device lacks a provisioning profile",
      agentDeviceError(
        "Runner is not provisioned for this device",
        "",
        "ios_runner_device_not_provisioned"
      ),
    ],
    [
      "agent-device classifies a signing failure",
      agentDeviceError("Runner failed", "Reason: signing_no_development_team."),
    ],
    [
      "developer mode is off",
      agentDeviceError(
        "Runner failed",
        "Reason: devtools_security_developer_mode_disabled."
      ),
    ],
  ])("fails fast when %s", (_, error) => {
    expect(isRunnerStartFailure(error)).toBe(true);
  });

  it.each([
    [
      "the element is not visible yet",
      agentDeviceError(
        'is visible failed for selector id="calendar": element is offscreen'
      ),
    ],
    [
      "no element matches the selector",
      agentDeviceError(
        'No element matches selector role="button" label="Start"'
      ),
    ],
    [
      "the check times out",
      agentDeviceError(
        "agent-device is timed out",
        '`agent-device is visible id="calendar"` did not answer within 30s.',
        "agent_device_timeout"
      ),
    ],
    [
      "the runner connection is refused once",
      agentDeviceError(
        "Runner did not accept connection",
        "Reason: runner_connect_refused."
      ),
    ],
    [
      "agent-device prints no JSON",
      agentDeviceError(
        "agent-device is failed",
        "agent-device returned no JSON result.",
        "agent_device_failed"
      ),
    ],
  ])("keeps polling when %s", (_, error) => {
    expect(isRunnerStartFailure(error)).toBe(false);
  });

  it("ignores errors that are not CliError", () => {
    expect(
      isRunnerStartFailure(new Error("xcodebuild build-for-testing failed"))
    ).toBe(false);
  });
});
