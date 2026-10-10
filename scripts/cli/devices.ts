import { getAndroidBuildEnv } from "../run-native.ts";
import { agentDevice } from "./agent-device.ts";
import { deviceFlag, readManagedDevices } from "./device.ts";
import { doctor } from "./doctor.ts";
import { PLATFORM_OPTION_SPEC, TARGET_OPTION_SPEC } from "./options.ts";
import { openMenuBar } from "./menu-bar.ts";
import { findConnectedPhone, readIosPhoneStates, readPhones } from "./phone.ts";
import {
  readForeignReservation,
  release,
  reserve,
  writePhones,
} from "./reservation.ts";
import type { PhoneInfo } from "./reservation.ts";
import { CliError, defineCommand, note, printTable } from "./shared.ts";
import type { Noun } from "./shared.ts";
import type { AgentPhone, IosState, TargetInput } from "./target.ts";
import { buildRows, phoneProblem, toPhoneType, toToken } from "./target.ts";

const DEFAULT_MINUTES = 60;
const MAX_GOAL_LENGTH = 120;

const isPhone = (device: AgentPhone) =>
  device.kind === "device" && device.target === "mobile";

const toPhoneInfo = (
  phone: AgentPhone,
  iosDevices?: IosState[]
): PhoneInfo => ({
  id: phone.id,
  target: toToken(phone.name, phone.id),
  name: phone.name,
  type: toPhoneType(phone, iosDevices),
});

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
  // Unreachable phones do not count as known. Locked phones do.
  writePhones(
    phoneData.phones
      .filter(
        (phone) =>
          isPhone(phone) && phoneProblem(phone, input)?.[0] !== "phone_offline"
      )
      .map((phone) => toPhoneInfo(phone, phoneData.iosDevices))
  );
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
  if (!phoneData.phones.some(isPhone)) {
    note("No phone connected. Connect a phone by cable and unlock it.");
  }
};

/** Find one connected phone without preflight. A locked phone can be reserved. */
const findTarget = async (target = "") => {
  const phone = await findConnectedPhone(target);
  let iosDevices: IosState[] = [];
  if (phone.platform === "ios") {
    try {
      iosDevices = readIosPhoneStates();
    } catch {
      // Type falls back to iPhone. A stuck device service must not block reserve.
    }
  }
  return toPhoneInfo(phone, iosDevices);
};

// agent-device keeps its claim on a phone while a session is open. A phone
// session is named after the target, see setPhoneSession.
const closeSession = async (phone: AgentPhone, session: string) => {
  try {
    await agentDevice(
      [
        "close",
        "--platform",
        phone.platform,
        deviceFlag(phone.platform),
        phone.id,
        "--session",
        session,
      ],
      { timeoutMs: 30_000 }
    );
    note(`Closed agent-device session ${session}`);
  } catch (error) {
    const isMissing =
      error instanceof CliError &&
      ["session_not_found", "no_open_session"].includes(error.status);
    if (!isMissing) {
      throw error;
    }
  }
};

const getGoal = (value = "") => {
  const goal = value.trim().replaceAll(/\s+/gu, " ");
  if (!goal || goal.length > MAX_GOAL_LENGTH) {
    throw new CliError({
      exitCode: 2,
      status: "invalid_goal",
      message: "Invalid value for --goal",
      why: `--goal needs 1 to ${MAX_GOAL_LENGTH} characters. Got ${goal.length}.`,
      fix: 'Say what you use the phone for, for example --goal="Proof video for tag swipes".',
    });
  }
  return goal;
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
  commandOrder: ["list", "reserve", "release", "doctor", "menubar"],
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
        "Usage: bun devices reserve --target=<target> --goal=<goal> [--minutes=<minutes>]",
      summary:
        "Reserve one phone for this checkout. Other checkouts cannot use it until release or expiry.",
      options: {
        target: TARGET_OPTION,
        goal: {
          value: "<goal>",
          isRequired: true,
          description: [
            `What you use the phone for. 1 to ${MAX_GOAL_LENGTH} characters.`,
            "Other agents and the menu bar app show it.",
          ],
        },
        minutes: {
          value: "<minutes>",
          description: [
            `Optional. Reservation length. Default: ${DEFAULT_MINUTES}.`,
            "Run reserve again to extend it.",
          ],
        },
      },
      errors: {
        missing_option: "--target or --goal not passed",
        invalid_goal: "--goal is empty or too long",
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
            'bun devices reserve --target=pixel-8-09yw --goal="Proof video for tag swipes"',
            'bun devices reserve --target=pixel-8-09yw --goal="e2e run" --minutes=120',
          ],
        },
      ],
      run: async (values) => {
        const goal = getGoal(values.goal);
        const minutes = getMinutes(values.minutes);
        const phone = await findTarget(values.target);
        const reservation = reserve(phone, goal, minutes);
        writePhones([phone], true);
        console.log(`${phone.target} ${reservation.expiresAt}`);
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
          title: "Behavior",
          lines: [
            "Also closes this phone's agent-device session, so agent-device frees the phone.",
          ],
        },
        {
          title: "Examples",
          lines: ["bun devices release --target=pixel-8-09yw"],
        },
      ],
      run: async (values) => {
        const phone = await findConnectedPhone(values.target ?? "");
        const target = toToken(phone.name, phone.id);
        const reservation = release(phone.id);
        await closeSession(phone, target);
        if (!reservation) {
          note(`note: ${target} had no reservation`);
        }
      },
    }),
    doctor: defineCommand({
      usage: "Usage: bun devices doctor",
      summary: "Check that Apple's device service answers. Never restarts it.",
      sections: [
        {
          title: "Behavior",
          lines: [
            "Runs `xcrun devicectl list devices` with a 20 second limit.",
            "On a hang, prints the restart command. Restart interrupts other sessions.",
          ],
        },
        {
          title: "Output",
          lines: ["One line on stdout: devicectl ok in <seconds>s."],
        },
      ],
      errors: {
        core_device_service_wedged: "devicectl did not answer in 20 seconds",
        devicectl_failed: "devicectl exited with an error",
      },
      run: () => doctor(),
    }),
    menubar: defineCommand({
      usage: "Usage: bun devices menubar",
      summary: "Open the macOS menu bar app that shows phone reservations.",
      errors: {
        menu_bar_build_failed: "swiftc could not build the app",
      },
      sections: [
        {
          title: "Behavior",
          lines: [
            "Menu bar shows <reserved>/<known> phones.",
            "Click it for one row per phone: type, goal, status.",
            "Known phones: reachable phones of the last `bun devices list`, plus every reserved phone.",
            "Builds the app on first run and after source changes.",
          ],
        },
        {
          title: "Requires",
          lines: ["Xcode command line tools (swiftc)."],
        },
      ],
      run: () => openMenuBar(),
    }),
  },
};

export { DEVICES };
