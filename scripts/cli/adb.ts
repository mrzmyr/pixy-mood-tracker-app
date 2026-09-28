import path from "node:path";
import { getAndroidBuildEnv } from "../run-native.ts";

/** Return adb from SDK selected for native builds. */
export const getAdb = () =>
  path.join(getAndroidBuildEnv().ANDROID_HOME, "platform-tools", "adb");
