import { isAppLockGuideSupported } from "../isAppLockGuideSupported";

describe("isAppLockGuideSupported", () => {
  it.each([
    ["ios", "17.5.1", false],
    ["ios", "18.0", true],
    ["ios", "26.4", true],
    ["android", 34, false],
    ["android", 35, true],
    ["web", "", false],
  ])("%s %s: %s", (os, version, expected) => {
    expect(isAppLockGuideSupported({ os, version })).toBe(expected);
  });
});
