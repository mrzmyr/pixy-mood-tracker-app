import { CliError } from "./shared.ts";

// agent-device errors that mean its iOS runner cannot start: signing,
// provisioning, or an xcodebuild that exits early. Every later call fails
// the same way, so retrying only delays the error.
const RUNNER_START_FAILURE =
  /xcodebuild build-for-testing failed|xcodebuild exited early|ios_runner_device_not_provisioned|Reason: (?:signing_|bundle_identifier_already_registered|devtools_security_developer_mode_disabled|device_developer_disk_image_unavailable)/iu;

const isRunnerStartFailure = (error: unknown): error is CliError =>
  error instanceof CliError &&
  RUNNER_START_FAILURE.test(`${error.status} ${error.message} ${error.why}`);

/** Tells a runner that cannot start from a check that can pass later. */
export { isRunnerStartFailure };
