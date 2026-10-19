import { Platform } from "react-native";

import pkg from "../../package.json";

const SUPPORT_EMAIL = "care@pixy.day";

/**
 * Support mail draft with the error code only: `why` can quote stored user
 * data, so it never goes into the body.
 */
export const getSupportMailUrl = (subject: string, status: string | number) => {
  const body = `\n\nError code: ${status}\nApp version: ${pkg.version}\nPlatform: ${Platform.OS}`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
