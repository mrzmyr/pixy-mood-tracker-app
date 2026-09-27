import { getAndroidBuildEnv } from "../run-native.ts";
import { readManagedDevices } from "./device.ts";
import { PLATFORM_OPTION_SPEC } from "./options.ts";
import { readPhones } from "./phone.ts";
import { CliError, defineCommand, note, printTable } from "./shared.ts";
import type { Noun } from "./shared.ts";
import type { TargetInput } from "./target.ts";
import { buildRows } from "./target.ts";

const list = async (platform?: string) => {
  try {
    getAndroidBuildEnv();
  } catch (error) {
    throw new CliError({
      status: "android_sdk_missing",
      message: "No Android SDK found",
      why: error instanceof Error ? error.message : String(error),
      fix: "Install Android SDK and set ANDROID_HOME, then retry.",
    });
  }
  const [phoneData, managed] = await Promise.all([
    readPhones(),
    readManagedDevices(),
  ]);
  const repositoryRoot = process.cwd();
  const input: TargetInput = {
    agentDevices: phoneData.phones,
    iosDevices: phoneData.iosDevices,
    adbStates: phoneData.adbStates,
    lockStates: phoneData.lockStates,
    managed,
    repositoryRoot,
  };
  if (platform === "ios" || platform === "android") {
    input.platform = platform;
  }
  const rows = buildRows(input);
  printTable(
    ["OPTION", "KIND", "OS", "NAME", "STATE", "PROBLEM"],
    rows.map((row) => [
      row.option,
      row.kind,
      row.os,
      row.name,
      row.state,
      row.problem,
    ])
  );
  if (
    !phoneData.phones.some(
      (phone) => phone.kind === "device" && phone.target === "mobile"
    )
  ) {
    note("No phone connected. Connect a phone by cable and unlock it.");
  }
};

const DEVICES: Noun = {
  summary: "List devices that can run the preview app.",
  helpTail: ["Run `bun devices <command> --help` for details."],
  commands: {
    list: defineCommand({
      usage: "Usage: bun devices list [--platform=<ios|android>]",
      summary: "List simulator, emulator, and connected phones.",
      options: {
        platform: {
          ...PLATFORM_OPTION_SPEC,
          description: ["Optional. Show only this platform. Default: both."],
        },
      },
      errors: {
        invalid_platform: "--platform is not ios or android",
        android_sdk_missing: "No Android SDK found",
      },
      sections: [
        {
          title: "Output",
          lines: [
            "Table on stdout, one row per device.",
            "OPTION   Copy this value into any `bun app` or `bun e2e` command",
            "KIND     simulator, emulator, or phone",
            "OS       ios or android",
            "NAME     Device name",
            "STATE    ready, booted, shutdown, not created, in use, or blocked",
            "PROBLEM  Cause when STATE is in use or blocked, else empty",
          ],
        },
        {
          title: "Examples",
          lines: ["bun devices list", "bun devices list --platform=android"],
        },
      ],
      run: (values) => list(values.platform),
    }),
  },
};

export { DEVICES };
