import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { agentDevice } from "./agent-device.ts";
import { getAdb } from "./adb.ts";
import { CliError } from "./shared.ts";
import type { Device } from "./device.ts";
import type { AgentPhone, IosState } from "./target.ts";

const run = (command: string, args: string[], timeout = 60_000) => {
  try {
    return execFileSync(command, args, {
      encoding: "utf-8",
      timeout,
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const isTimeout =
      error instanceof Error && "code" in error && error.code === "ETIMEDOUT";
    // Apple's CoreDevice service stops answering after long runner sessions.
    // Every devicectl call then hangs until it is restarted.
    if (isTimeout && args[0] === "devicectl") {
      throw new CliError({
        status: "coredevice_stuck",
        message: `xcrun devicectl ${args.slice(1, 3).join(" ")} did not answer`,
        why: `Apple's device service gave no answer within ${timeout / 1000} seconds.`,
        fix: "Restart it with `pkill -f CoreDeviceService` (macOS starts it again), then retry. If it fails again, reconnect the cable.",
      });
    }
    if (isTimeout) {
      throw new CliError({
        status: "phone_command_timeout",
        message: `${path.basename(command)} ${args.slice(0, 3).join(" ")} did not answer`,
        why: `The phone gave no answer within ${timeout / 1000} seconds.`,
        fix: "Unlock the phone, check the cable, then retry.",
      });
    }
    throw error;
  }
};
const withJsonFile = <T>(purpose: string, action: (file: string) => T): T => {
  const file = path.join(
    os.tmpdir(),
    `pixy-mood-tracker-devicectl-${process.pid}-${purpose}.json`
  );
  try {
    return action(file);
  } finally {
    fs.rmSync(file, { force: true });
  }
};

/** Read the connected iOS phone state without changing device state. */
export const readIosPhoneStates = () =>
  withJsonFile("list", (file) => {
    run("xcrun", ["devicectl", "list", "devices", "--json-output", file]);
    return (
      // SAFETY: devicectl writes the result schema documented in section 6 of the CLI spec.
      (
        JSON.parse(fs.readFileSync(file, "utf-8")) as {
          result?: { devices?: IosState[] };
        }
      ).result?.devices ?? []
    );
  });

/** Read Android phone serial states through the selected SDK adb binary. */
export const readAndroidStates = () => {
  const output = run(getAdb(), ["devices"]);
  return Object.fromEntries(
    output
      .split("\n")
      .slice(1)
      .flatMap((line) => {
        const [serial, state] = line.trim().split(/\s+/u);
        return serial && state ? [[serial, state]] : [];
      })
  );
};

/** Read phone identities and status details concurrently for device listing. */
export const readPhones = async () => {
  const [agent, iosDevices, adbStates] = await Promise.all([
    agentDevice<{ devices: AgentPhone[] }>(["devices"]),
    Promise.resolve().then(readIosPhoneStates),
    Promise.resolve().then(readAndroidStates),
  ]);
  const lockStates: Record<string, boolean | undefined> = {};
  const pairedPhones = (agent.devices ?? []).filter((phone) => {
    if (phone.platform !== "ios" || phone.kind !== "device") {
      return false;
    }
    const state = iosDevices.find(
      (device) => device.hardwareProperties?.udid === phone.id
    );
    return (
      state?.deviceProperties?.bootState === "booted" &&
      state.connectionProperties?.pairingState === "paired" &&
      state.deviceProperties.developerModeStatus === "enabled"
    );
  });
  for (const [index, phone] of pairedPhones.entries()) {
    try {
      const result = withJsonFile(`lock-${index}`, (file) => {
        run("xcrun", [
          "devicectl",
          "device",
          "info",
          "lockState",
          "--device",
          phone.id,
          "--json-output",
          file,
        ]);
        // SAFETY: devicectl lockState output has a result.passcodeRequired boolean.
        return JSON.parse(fs.readFileSync(file, "utf-8")) as {
          result?: { passcodeRequired?: boolean };
        };
      });
      lockStates[phone.id] = result.result?.passcodeRequired;
    } catch {
      lockStates[phone.id] = undefined;
    }
  }
  return { phones: agent.devices ?? [], iosDevices, adbStates, lockStates };
};

const phoneError = (status: string, phone: Device, why: string, fix: string) =>
  new CliError({ status, message: `${phone.key}: ${why}`, why, fix });

/** Check pairing, reachability, developer mode, authorization, and lock state before phone actions. */
export const preflightPhone = (phone: Device) => {
  if (phone.platform === "ios") {
    const device = readIosPhoneStates().find(
      (entry) => entry.hardwareProperties?.udid === phone.id
    );
    if (!device || device.deviceProperties?.bootState !== "booted") {
      throw phoneError(
        "phone_offline",
        phone,
        "Phone is not reachable.",
        "Connect the phone by cable, then retry."
      );
    }
    if (device.connectionProperties?.pairingState !== "paired") {
      throw phoneError(
        "phone_not_paired",
        phone,
        "Phone does not trust this Mac.",
        "Unlock the phone, tap Trust, then retry."
      );
    }
    if (device.deviceProperties?.developerModeStatus !== "enabled") {
      throw phoneError(
        "developer_mode_off",
        phone,
        "Developer Mode is off.",
        "Open Settings > Privacy & Security > Developer Mode, then retry."
      );
    }
    const lock = withJsonFile("lock", (file) => {
      run("xcrun", [
        "devicectl",
        "device",
        "info",
        "lockState",
        "--device",
        phone.id,
        "--json-output",
        file,
      ]);
      // SAFETY: devicectl lockState output has a result.passcodeRequired boolean.
      return JSON.parse(fs.readFileSync(file, "utf-8")) as {
        result?: { passcodeRequired?: boolean };
      };
    });
    if (lock.result?.passcodeRequired) {
      throw phoneError(
        "phone_locked",
        phone,
        "Phone is locked.",
        "Unlock the phone, then retry."
      );
    }
  } else {
    const state = readAndroidStates()[phone.id];
    if (state === "offline") {
      throw phoneError(
        "phone_offline",
        phone,
        "Phone is offline.",
        "Connect the phone by cable, then retry."
      );
    }
    if (state === "unauthorized") {
      throw phoneError(
        "phone_unauthorized",
        phone,
        "Phone refuses USB debugging.",
        'Unlock the phone, accept "Allow USB debugging", then retry.'
      );
    }
    run(getAdb(), [
      "-s",
      phone.id,
      "shell",
      "input",
      "keyevent",
      "KEYCODE_WAKEUP",
    ]);
    run(getAdb(), ["-s", phone.id, "shell", "wm", "dismiss-keyguard"]);
    if (
      run(getAdb(), ["-s", phone.id, "shell", "dumpsys", "window"]).includes(
        "isKeyguardShowing=true"
      )
    ) {
      throw phoneError(
        "phone_locked",
        phone,
        "Phone is locked.",
        "Unlock the phone, then retry."
      );
    }
  }
};

/** Install preview app bundle on one physical phone. */
export const installPhoneApp = (phone: Device, appPath: string) =>
  phone.platform === "ios"
    ? run("xcrun", [
        "devicectl",
        "device",
        "install",
        "app",
        "--device",
        phone.id,
        appPath,
      ])
    : run(getAdb(), ["-s", phone.id, "install", "-r", appPath]);

/** Check whether preview app is installed on one physical phone. */
export const isPhoneAppInstalled = (phone: Device, bundleId: string) =>
  phone.platform === "ios"
    ? withJsonFile("apps", (file) => {
        run("xcrun", [
          "devicectl",
          "device",
          "info",
          "apps",
          "--device",
          phone.id,
          "--bundle-id",
          bundleId,
          "--json-output",
          file,
        ]);
        // SAFETY: devicectl apps output has a result.apps array.
        const apps = (
          JSON.parse(fs.readFileSync(file, "utf-8")) as {
            result?: { apps?: unknown[] };
          }
        ).result?.apps;
        return (apps?.length ?? 0) > 0;
      })
    : Boolean(run(getAdb(), ["-s", phone.id, "shell", "pm", "path", bundleId]));

/** Remove preview app from one physical phone. */
export const uninstallPhoneApp = (phone: Device, bundleId: string) =>
  phone.platform === "ios"
    ? run("xcrun", [
        "devicectl",
        "device",
        "uninstall",
        "app",
        "--device",
        phone.id,
        bundleId,
      ])
    : run(getAdb(), ["-s", phone.id, "uninstall", bundleId]);

/** Stop preview app without shutting down phone. */
export const stopPhoneApp = (
  phone: Device,
  bundleId: string,
  appName: string
) =>
  phone.platform === "android"
    ? run(getAdb(), ["-s", phone.id, "shell", "am", "force-stop", bundleId])
    : withJsonFile("processes", (file) => {
        run("xcrun", [
          "devicectl",
          "device",
          "info",
          "processes",
          "--device",
          phone.id,
          "--json-output",
          file,
        ]);
        // SAFETY: devicectl writes { result: { runningProcesses } } to the JSON file.
        const processes = (
          JSON.parse(fs.readFileSync(file, "utf-8")) as {
            result: {
              runningProcesses: {
                executable?: string;
                processIdentifier: number;
              }[];
            };
          }
        ).result.runningProcesses;
        const executable = appName.replaceAll(/[^a-zA-Z0-9]/gu, "");
        const matchingProcesses = processes.filter((process) =>
          process.executable?.endsWith(`.app/${executable}`)
        );
        for (const process of matchingProcesses) {
          run("xcrun", [
            "devicectl",
            "device",
            "process",
            "terminate",
            "--device",
            phone.id,
            "--pid",
            String(process.processIdentifier),
          ]);
        }
      });
/** Remove preview app data on Android or uninstall it on iOS. */
export const clearPhoneAppData = (phone: Device, bundleId: string) =>
  phone.platform === "android"
    ? run(getAdb(), ["-s", phone.id, "shell", "pm", "clear", bundleId])
    : uninstallPhoneApp(phone, bundleId);
