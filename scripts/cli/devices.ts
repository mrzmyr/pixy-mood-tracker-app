import { getAndroidBuildEnv } from "../run-native.ts";
import { agentDevice } from "./agent-device.ts";
import { readManagedDevices } from "./device.ts";
import { PLATFORM_OPTION_SPEC, TARGET_OPTION_SPEC } from "./options.ts";
import { readPhones } from "./phone.ts";
import { readForeignReservation, release, reserve } from "./reservation.ts";
import { CliError, defineCommand, note, printTable } from "./shared.ts";
import type { Noun } from "./shared.ts";
import type { AgentPhone, TargetInput } from "./target.ts";
import { buildRows, findPhone, toToken } from "./target.ts";

const DEFAULT_MINUTES = 60;

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
    reservations: Object.fromEntries(
      phoneData.phones.flatMap((phone) => {
        const reservation = readForeignReservation(phone.id);
        return reservation ? [[phone.id, reservation]] : [];
      })
    ),
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

/** Find one connected phone without preflight. A locked phone can be reserved. */
const findTarget = async (target = "") => {
  const { devices = [] } = await agentDevice<{ devices?: AgentPhone[] }>([
    "devices",
  ]);
  const phone = findPhone(
    devices.filter(
      (device) => device.kind === "device" && device.target === "mobile"
    ),
    target
  );
  return { id: phone.id, token: toToken(phone.name, phone.id) };
};

const getMinutes = (value = String(DEFAULT_MINUTES)) => {
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < 1) {
    throw new CliError({
      exitCode: 2,
      status: "invalid_value",
      message: `Invalid value "${value}" for --minutes`,
      why: "--minutes accepts a whole number of 1 or more.",
      fix: `Pass --minutes=${DEFAULT_MINUTES}, or omit it.`,
    });
  }
  return minutes;
};

const TARGET_OPTION = { ...TARGET_OPTION_SPEC, isRequired: true };

const DEVICES: Noun = {
  summary: "List and reserve devices that can run the preview app.",
  commandOrder: ["list", "reserve", "release"],
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
    reserve: defineCommand({
      usage:
        "Usage: bun devices reserve --target=<target> [--minutes=<minutes>]",
      summary:
        "Reserve one phone for this checkout. Other checkouts cannot use it until release or expiry.",
      options: {
        target: TARGET_OPTION,
        minutes: {
          value: "<minutes>",
          description: [
            `Optional. Reservation length. Default: ${DEFAULT_MINUTES}.`,
            "Run reserve again to extend it.",
          ],
        },
      },
      errors: {
        missing_option: "--target not passed",
        invalid_value: "--minutes is not a whole number of 1 or more",
        target_not_found: "No connected phone has this target",
        device_reserved: "Another checkout reserved this phone",
      },
      sections: [
        {
          title: "Behavior",
          lines: [
            "Every `bun app` and `bun e2e` command in other checkouts fails with device_reserved.",
            "Reservation ends at release, at expiry, or when its checkout is deleted.",
          ],
        },
        {
          title: "Output",
          lines: ["One line on stdout: <target> <expiry time>."],
        },
        {
          title: "Examples",
          lines: [
            "bun devices reserve --target=pixel-8-09yw",
            "bun devices reserve --target=pixel-8-09yw --minutes=120",
          ],
        },
      ],
      run: async (values) => {
        const minutes = getMinutes(values.minutes);
        const phone = await findTarget(values.target);
        const reservation = reserve(phone.id, phone.token, minutes);
        console.log(`${phone.token} ${reservation.expiresAt}`);
      },
    }),
    release: defineCommand({
      usage: "Usage: bun devices release --target=<target>",
      summary: "Release this checkout's reservation of one phone.",
      options: { target: TARGET_OPTION },
      errors: {
        missing_option: "--target not passed",
        target_not_found: "No connected phone has this target",
        device_reserved: "Another checkout reserved this phone",
      },
      sections: [
        {
          title: "Examples",
          lines: ["bun devices release --target=pixel-8-09yw"],
        },
      ],
      run: async (values) => {
        const phone = await findTarget(values.target);
        if (!release(phone.id)) {
          note(`note: ${phone.token} had no reservation`);
        }
      },
    }),
  },
};

export { DEVICES };
