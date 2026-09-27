import { describe, expect, test } from "bun:test";
import {
  checkRunnerSigning,
  includesPhone,
  matchesBundleId,
  parseProfile,
} from "../provisioning.ts";

const phoneId = ["00008120", "-000A11112222201E"].join("");
const requireProfile = (xml: string) => {
  const profile = parseProfile(xml);
  if (!profile) {
    const error = Object.assign(new Error("Test profile XML did not parse"), {
      status: "test_profile_invalid",
      message: "Test profile XML did not parse",
      why: "The generated test profile has invalid XML fields.",
      fix: "Fix profileXml in provisioning.test.ts.",
    });
    throw error;
  }
  return profile;
};
const profileXml = (
  devices: string[] = [phoneId],
  appId = "TEAMPLACEHOLDER.com.example.runner"
) => `
<plist><dict>
<key>Name</key><string>Test profile</string>
<key>application-identifier</key><string>${appId}</string>
<key>ExpirationDate</key><date>2099-01-01T00:00:00Z</date>
<key>ProvisionedDevices</key><array>${devices.map((id) => `<string>${id}</string>`).join("")}</array>
<key>aps-environment</key><string>development</string>
</dict></plist>`;

describe("provisioning profiles", () => {
  test("parseProfile reads profile XML", () => {
    expect(parseProfile(profileXml())).toMatchObject({
      appId: "TEAMPLACEHOLDER.com.example.runner",
      devices: [phoneId],
      hasPush: true,
      isAllDevices: false,
      name: "Test profile",
    });
  });

  test("matchesBundleId supports exact and wildcard identifiers", () => {
    const exact = requireProfile(profileXml());
    const wildcard = requireProfile(
      profileXml([], "TEAMPLACEHOLDER.com.example.*")
    );
    expect(matchesBundleId(exact, "com.example.runner")).toBe(true);
    expect(matchesBundleId(wildcard, "com.example.other")).toBe(true);
  });

  test("includesPhone checks provisioned device list and all-device profiles", () => {
    const profile = requireProfile(profileXml());
    expect(includesPhone(profile, phoneId)).toBe(true);
    expect(includesPhone(profile, "other-phone")).toBe(false);
    expect(
      includesPhone({ ...profile, isAllDevices: true }, "other-phone")
    ).toBe(true);
  });

  test("checkRunnerSigning accepts cached and local signing profiles", () => {
    const profile = {
      ...requireProfile(profileXml()),
      file: "profile.mobileprovision",
    };
    expect(
      checkRunnerSigning({
        udid: phoneId,
        bundleId: "com.example.runner",
        caches: [{ dir: "cache", profiles: [profile] }],
        localProfiles: [],
        now: Date.now(),
      })
    ).toMatchObject({ status: "ok", source: "cache" });
    expect(
      checkRunnerSigning({
        udid: phoneId,
        bundleId: "com.example.runner",
        caches: [],
        localProfiles: [profile],
        now: Date.now(),
      })
    ).toMatchObject({ status: "ok", source: "local" });
  });

  test("checkRunnerSigning rejects stale cached and local profiles", () => {
    const profile = {
      ...requireProfile(profileXml(["other-phone"])),
      file: "profile.mobileprovision",
    };
    expect(
      checkRunnerSigning({
        udid: phoneId,
        bundleId: "com.example.runner",
        caches: [{ dir: "cache", profiles: [profile] }],
        localProfiles: [],
        now: Date.now(),
      })
    ).toMatchObject({ status: "stale", caches: ["cache"] });
    expect(
      checkRunnerSigning({
        udid: phoneId,
        bundleId: "com.example.runner",
        caches: [],
        localProfiles: [profile],
        now: Date.now(),
      })
    ).toMatchObject({ status: "stale", profiles: [profile] });
  });

  test("checkRunnerSigning reports unknown when no profile exists", () => {
    expect(
      checkRunnerSigning({
        udid: phoneId,
        bundleId: "com.example.runner",
        caches: [],
        localProfiles: [],
        now: Date.now(),
      })
    ).toEqual({ status: "unknown" });
  });
});
