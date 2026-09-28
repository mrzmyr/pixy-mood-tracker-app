import path from "node:path";
import { getAndroidBuildEnv } from "../run-native.ts";

/** Return adb from SDK selected for native builds. */
export const getAdb = () =>
  path.join(getAndroidBuildEnv().ANDROID_HOME, "platform-tools", "adb");

/**
 * adb arguments that list installed packages matching `packageId`. Exits 0
 * when nothing matches; `pm path` exits 1 there, which execFileSync throws.
 */
export const listPackagesArgs = (serial: string, packageId: string) => [
  "-s",
  serial,
  "shell",
  "pm",
  "list",
  "packages",
  packageId,
];

/**
 * True when `pm list packages` output has this exact package. The filter
 * matches substrings: `com.devmood.pixymoodtracker` also lists `.preview`.
 */
export const listsPackage = (output: string, packageId: string) =>
  output.split("\n").some((line) => line.trim() === `package:${packageId}`);
