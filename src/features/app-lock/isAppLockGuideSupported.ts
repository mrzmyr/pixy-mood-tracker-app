import { Platform } from "react-native";

/** iOS 18 added Require Face ID to the Home Screen app menu. */
const MIN_IOS_MAJOR = 18;
/** Android 15 (API 35) added Private space. */
const MIN_ANDROID_API = 35;

/**
 * Whether the OS can lock Pixy behind Face ID, fingerprint, or PIN, so
 * Settings shows the App lock guide. Pixy has no lock of its own.
 */
export const isAppLockGuideSupported = ({
  os,
  version,
}: {
  os: string;
  version: string | number;
}) => {
  if (os === "ios") {
    const [major] = String(version).split(".");
    return Number(major) >= MIN_IOS_MAJOR;
  }

  if (os === "android") {
    return Number(version) >= MIN_ANDROID_API;
  }

  return false;
};

/** {@link isAppLockGuideSupported} for this device. */
export const IS_APP_LOCK_GUIDE_SUPPORTED = isAppLockGuideSupported({
  os: Platform.OS,
  version: Platform.Version,
});
