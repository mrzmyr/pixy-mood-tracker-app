import { CliError } from "./shared.ts";
import type { OptionSpec } from "./shared.ts";

/** Shared closed platform choice used by commands that target managed devices. */
export const PLATFORM_OPTION_SPEC: OptionSpec = {
  value: "<ios|android>",
  description: [
    "Simulator (ios) or emulator (android) of this checkout.",
    "CLI creates and boots it.",
  ],
  choices: ["ios", "android"],
  invalidStatus: "invalid_platform",
};
/** Shared token placeholder for physical phone commands. */
export const TARGET_OPTION_SPEC: OptionSpec = {
  value: "<target>",
  description: ["One phone. Copy the value from `bun devices list`."],
};
/** Stable option order for every command that selects one device. */
export const DEVICE_OPTIONS = {
  platform: PLATFORM_OPTION_SPEC,
  target: TARGET_OPTION_SPEC,
};
/** Common device errors in help-page order. */
export const DEVICE_ERRORS = {
  missing_option: "Neither --platform nor --target passed",
  conflicting_options: "Both --platform and --target passed",
  invalid_platform: "--platform is not ios or android",
  target_not_found: "No connected phone has this target",
  phone_offline: "Phone not reachable",
  phone_unauthorized: "Android phone refuses USB debugging",
  phone_not_paired: "iPhone does not trust this Mac",
  developer_mode_off: "iPhone has Developer Mode off",
  phone_locked: "Phone is locked",
  device_in_use: "Another run holds this device",
};

/** Validate platform values after parser precedence checks. */
export const getPlatform = (value: string | undefined) => {
  if (value === "ios" || value === "android") {
    return value;
  }
  if (value === undefined) {
    return;
  }
  throw new CliError({
    exitCode: 2,
    status: "invalid_platform",
    message: `Unknown platform "${value ?? ""}"`,
    why: "--platform accepts: ios, android.",
    fix: "Pass --platform=ios or --platform=android.",
  });
};
