// Drives the machine's Android emulator for one capture. Launch, links,
// settings, and screenshots go through adb; waits, taps, and trees go
// through agent-device. Part of every Android input hash.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { getAdb } from "../cli/adb.ts";
import { agentDevice } from "../cli/agent-device.ts";
import { installFile } from "../cli/app-install.ts";
import { ensureDevice } from "../cli/device.ts";
import { CliError } from "../cli/shared.ts";
import { getAndroidBuildEnv } from "../run-native.ts";
import { PREVIEW } from "./driver.ts";
import type { Driver } from "./driver.ts";
import { normalizePng } from "./png.ts";
import { ANDROID_PROFILE } from "./profile.ts";
import type { Appearance } from "./profile.ts";
import { readProbes } from "./tree.ts";
import type { Probes, RawNode } from "./tree.ts";

/** The pinned system image is installed; another image renders other pixels. */
export const runAndroidPreflight = () => {
  const { package: pkg, revision } = ANDROID_PROFILE.systemImage;
  const sdk = getAndroidBuildEnv().ANDROID_HOME;
  const file = path.join(sdk, ...pkg.split(";"), "source.properties");
  const found = fs.existsSync(file)
    ? /^Pkg\.Revision=(?<value>.+)$/mu.exec(fs.readFileSync(file, "utf-8"))
        ?.groups?.value
    : undefined;
  const ok = found === revision;
  process.stdout.write(
    `${ok ? "ok  " : "fail"} ${"android".padEnd(12)} ${pkg} r${found ?? "missing"}\n`
  );
  if (!ok) {
    throw new CliError({
      status: "preflight_android",
      message: `System image ${pkg} r${revision} missing`,
      why: `Installed: r${found ?? "none"}. Another image renders other pixels.`,
      fix: `Run \`sdkmanager "${pkg}"\`. If the latest revision is newer, update ANDROID_PROFILE in scripts/sitemap/profile.ts.`,
    });
  }
};

/** Normalized PNG bytes and hash. The emulator draws no island noise. */
export const normalizeAndroidScreenshot = (bytes: Buffer) =>
  normalizePng(bytes);

/** Emulator session of one capture run. Installs the APK. */
export const createAndroidDriver = async (apk: string): Promise<Driver> => {
  const device = await ensureDevice("android");
  const serial = device.id;
  const deviceArgs = ["--platform", "android", "--serial", serial];
  const pkg = PREVIEW.appId;
  let launchedAt = 0;

  const adb = (args: string[]) =>
    execFileSync(getAdb(), ["-s", serial, ...args], {
      encoding: "utf-8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60_000,
    }).trim();
  const tryAdb = (args: string[]) => {
    try {
      return adb(args);
    } catch {
      return null;
    }
  };
  const shell = (...args: string[]) => adb(["shell", ...args]);
  const demo = (command: string, extras: string[] = []) =>
    shell(
      "am",
      "broadcast",
      "-a",
      "com.android.systemui.demo",
      "-e",
      "command",
      command,
      ...extras
    );

  tryAdb(["uninstall", pkg]);
  installFile(device, apk, "sitemap capture");

  const prepare = () => {
    const { timeZone, locale, fontScale, statusBar } = ANDROID_PROFILE;
    const deviceLocale = shell("getprop", "persist.sys.locale");
    if (deviceLocale !== "" && deviceLocale !== locale) {
      throw new CliError({
        status: "emulator_profile_mismatch",
        message: `Emulator locale is ${deviceLocale}, not ${locale}`,
        why: "Dates and numbers render in the device locale.",
        fix: `Set the emulator language to ${locale} in Settings > System > Languages, then retry.`,
      });
    }
    shell("settings", "put", "global", "auto_time_zone", "0");
    shell("service", "call", "alarm", "3", "s16", timeZone);
    shell("settings", "put", "system", "font_scale", fontScale);
    // Remove animations: the app reads it as reduced motion.
    for (const key of [
      "window_animation_scale",
      "transition_animation_scale",
      "animator_duration_scale",
    ]) {
      shell("settings", "put", "global", key, "0");
    }
    shell("settings", "put", "global", "sysui_demo_allowed", "1");
    demo("enter");
    demo("clock", ["-e", "hhmm", statusBar.clock]);
    demo("battery", [
      "-e",
      "level",
      statusBar.battery,
      "-e",
      "plugged",
      "false",
    ]);
    demo("network", [
      "-e",
      "wifi",
      "show",
      "-e",
      "level",
      statusBar.wifi,
      "-e",
      "fully",
      "true",
    ]);
    demo("network", ["-e", "mobile", "hide"]);
    demo("notifications", ["-e", "visible", "false"]);
    // Location off: no passive place. Notifications on: no permission dialog.
    for (const permission of [
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
    ]) {
      tryAdb(["shell", "pm", "revoke", pkg, permission]);
    }
    tryAdb([
      "shell",
      "pm",
      "grant",
      pkg,
      "android.permission.POST_NOTIFICATIONS",
    ]);
    const zone = shell("getprop", "persist.sys.timezone");
    if (zone !== timeZone) {
      throw new CliError({
        status: "emulator_profile_mismatch",
        message: `Emulator time zone is ${zone}, not ${timeZone}`,
        why: "`service call alarm 3` did not set it. Dates render in the device zone.",
        fix: `Set the emulator time zone to ${timeZone} in Settings > System > Date & time, then retry.`,
      });
    }
  };

  const restore = () => {
    tryAdb([
      "shell",
      "am",
      "broadcast",
      "-a",
      "com.android.systemui.demo",
      "-e",
      "command",
      "exit",
    ]);
    tryAdb(["shell", "cmd", "uimode", "night", "no"]);
    for (const key of [
      "window_animation_scale",
      "transition_animation_scale",
      "animator_duration_scale",
    ]) {
      tryAdb(["shell", "settings", "put", "global", key, "1"]);
    }
  };

  const setAppearance = (appearance: Appearance) => {
    shell("cmd", "uimode", "night", appearance === "dark" ? "yes" : "no");
  };

  const pid = () => {
    const value = Number(tryAdb(["shell", "pidof", pkg]) ?? "");
    return Number.isInteger(value) && value > 0 ? value : null;
  };

  const launch = async () => {
    shell("am", "force-stop", pkg);
    shell("logcat", "-b", "crash", "-c");
    launchedAt = Date.now();
    // `monkey` aborts on an emulator without physical keys.
    shell("am", "start", "-W", "-n", `${pkg}/.MainActivity`);
    await agentDevice(["open", pkg, ...deviceArgs], { timeoutMs: 120_000 });
  };

  const secondsSinceLaunch = () => (Date.now() - launchedAt) / 1000;

  const openUrl = (url: string) => {
    shell(
      "am",
      "start",
      "-a",
      "android.intent.action.VIEW",
      "-d",
      `'${url}'`,
      pkg
    );
  };

  const openPath = (route: string) =>
    openUrl(`${PREVIEW.scheme}://${route.replace(/^\//u, "")}`);

  const snapshot = async () => {
    const data = await agentDevice<{ nodes: RawNode[] }>(
      // --raw: the regular Android tree drops the 1 dp probes under the
      // status bar as not visible to the user.
      ["snapshot", "--raw", ...deviceArgs],
      { timeoutMs: 60_000 }
    );
    return data.nodes ?? [];
  };

  const pollProbes = async (
    isDone: (probes: Probes) => boolean,
    timeoutMs: number
  ) => {
    const deadline = Date.now() + timeoutMs;
    let nodes: RawNode[] = [];
    let probes = readProbes(nodes);
    while (Date.now() < deadline) {
      // oxlint-disable-next-line no-await-in-loop -- poll the probes
      nodes = await snapshot();
      probes = readProbes(nodes);
      if (isDone(probes)) {
        return { probes, nodes, isDone: true };
      }
      // oxlint-disable-next-line no-await-in-loop -- poll the probes
      await sleep(250);
    }
    return { probes, nodes, isDone: false };
  };

  const waitFor = async (selector: string, timeoutMs = 15_000) => {
    await agentDevice(["wait", selector, String(timeoutMs), ...deviceArgs], {
      timeoutMs: timeoutMs + 15_000,
    });
  };

  const readAlert = async () => {
    try {
      const result = await agentDevice<{
        status?: string;
        alert?: { title?: string; message?: string } | null;
      }>(["alert", "get", ...deviceArgs], { timeoutMs: 15_000 });
      if (!result.alert || result.status === "none") {
        return null;
      }
      const { title, message } = result.alert;
      return [title, message].filter(Boolean).join(": ") || "alert";
    } catch {
      return null;
    }
  };

  const screenshot = (file: string) => {
    const bytes = execFileSync(
      getAdb(),
      ["-s", serial, "exec-out", "screencap", "-p"],
      { maxBuffer: 64 * 1024 * 1024, timeout: 60_000 }
    );
    fs.writeFileSync(file, bytes);
    return bytes;
  };

  const findCrashReport = () => {
    const log = tryAdb(["logcat", "-b", "crash", "-d"]) ?? "";
    if (!log.includes(pkg)) {
      return null;
    }
    const file = path.join(
      path.dirname(apk),
      `crash-${new Date(launchedAt).toISOString().replaceAll(":", "-")}.txt`
    );
    fs.writeFileSync(file, log);
    return file;
  };

  return {
    prepare,
    restore,
    setAppearance,
    launch,
    pid,
    secondsSinceLaunch,
    openUrl,
    openPath,
    snapshot,
    pollProbes,
    waitFor,
    readAlert,
    screenshot,
    findCrashReport,
  };
};
