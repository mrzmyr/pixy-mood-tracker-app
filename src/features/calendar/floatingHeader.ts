import { Platform } from "react-native";

// iOS reports "26.0" or "26.0.1": compare the major version only.
const IOS_MAJOR_VERSION =
  Platform.OS === "ios" ? Number(String(Platform.Version).split(".")[0]) : 0;

/**
 * iOS 26+: the calendar header is transparent, so Liquid Glass buttons float
 * over the scrolling calendar. iOS before 26 has no glass buttons and Android
 * Material top app bars stay opaque, so both keep an opaque header.
 */
export const HAS_FLOATING_HEADER = IOS_MAJOR_VERSION >= 26;
