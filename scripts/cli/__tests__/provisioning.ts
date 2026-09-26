import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  checkRunnerSigning,
  findRunnerCaches,
  includesPhone,
  matchesBundleId,
  parseProfile,
} from "../provisioning.ts";
import type { LocalProfile, Profile } from "../provisioning.ts";

// Fake values only. Never real device or team identifiers.
const TEAM = "TEAM000000";
const OLD_PHONE = "00000000-0000000000000001";
const NEW_PHONE = "00000000-0000000000000002";
const RUNNER = "com.example.app.agentdevice";
const NOW = Date.parse("2026-09-26T00:00:00Z");
const FUTURE = Date.parse("2027-09-26T00:00:00Z");
const PAST = Date.parse("2026-01-01T00:00:00Z");

// Shape of `security cms -D -i` output, cut to the keys the parser reads.
// application-identifier also appears inside Entitlements, before Name.
const profileXml = (
  devices: string[]
) => `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
	<key>Entitlements</key>
	<dict>
		<key>application-identifier</key>
		<string>${TEAM}.*</string>
		<key>get-task-allow</key>
		<true/>
	</dict>
	<key>ExpirationDate</key>
	<date>2027-09-26T00:00:00Z</date>
	<key>Name</key>
	<string>iOS Team Provisioning Profile: *</string>
	<key>ProvisionedDevices</key>
	<array>
${devices.map((udid) => `		<string>${udid}</string>`).join("\n")}
	</array>
</dict>
</plist>`;

const profile = (overrides: Partial<Profile> = {}): Profile => ({
  appId: `${TEAM}.*`,
  devices: [OLD_PHONE],
  expires: FUTURE,
  hasPush: false,
  isAllDevices: false,
  name: "iOS Team Provisioning Profile: *",
  ...overrides,
});

const local = (
  file: string,
  overrides: Partial<Profile> = {}
): LocalProfile => ({ ...profile(overrides), file });

const check = (
  options: Partial<Parameters<typeof checkRunnerSigning>[0]> = {}
) =>
  checkRunnerSigning({
    bundleId: RUNNER,
    caches: [],
    localProfiles: [],
    now: NOW,
    udid: NEW_PHONE,
    ...options,
  });

describe("parseProfile", () => {
  it("reads the team wildcard profile", () => {
    expect(parseProfile(profileXml([OLD_PHONE, NEW_PHONE]))).toEqual({
      appId: `${TEAM}.*`,
      devices: [OLD_PHONE, NEW_PHONE],
      expires: FUTURE,
      hasPush: false,
      isAllDevices: false,
      name: "iOS Team Provisioning Profile: *",
    });
  });

  it("returns null without application-identifier", () => {
    expect(parseProfile("<plist><dict></dict></plist>")).toBeNull();
  });
});

describe("matchesBundleId", () => {
  it("matches wildcards by prefix and explicit IDs exactly", () => {
    expect(matchesBundleId(profile(), RUNNER)).toBe(true);
    expect(
      matchesBundleId(profile({ appId: `${TEAM}.com.example.*` }), RUNNER)
    ).toBe(true);
    expect(
      matchesBundleId(profile({ appId: `${TEAM}.${RUNNER}` }), RUNNER)
    ).toBe(true);
    expect(
      matchesBundleId(profile({ appId: `${TEAM}.com.example.app` }), RUNNER)
    ).toBe(false);
  });
});

describe("includesPhone", () => {
  it("accepts listed phones and all-device profiles", () => {
    expect(includesPhone(profile(), OLD_PHONE)).toBe(true);
    expect(includesPhone(profile(), NEW_PHONE)).toBe(false);
    expect(
      includesPhone(profile({ devices: [], isAllDevices: true }), NEW_PHONE)
    ).toBe(true);
  });
});

describe("checkRunnerSigning", () => {
  it("flags a cached runner and a local wildcard without the phone", () => {
    const stale = local("/profiles/stale.mobileprovision");
    expect(
      check({
        caches: [{ dir: "/derived/cache-a", profiles: [profile()] }],
        localProfiles: [stale],
      })
    ).toEqual({
      caches: ["/derived/cache-a"],
      profiles: [stale],
      status: "stale",
    });
  });

  it("flags only the cache when a local profile includes the phone", () => {
    expect(
      check({
        caches: [{ dir: "/derived/cache-a", profiles: [profile()] }],
        localProfiles: [
          local("/profiles/fresh.mobileprovision", {
            devices: [OLD_PHONE, NEW_PHONE],
          }),
        ],
      })
    ).toEqual({ caches: ["/derived/cache-a"], profiles: [], status: "stale" });
  });

  it("flags a cached runner with an expired profile", () => {
    expect(
      check({
        caches: [
          {
            dir: "/derived/cache-a",
            profiles: [profile({ devices: [NEW_PHONE], expires: PAST })],
          },
        ],
      })
    ).toMatchObject({ caches: ["/derived/cache-a"], status: "stale" });
  });

  it("passes a cached runner that includes the phone", () => {
    const cached = profile({ devices: [NEW_PHONE] });
    expect(
      check({
        caches: [{ dir: "/derived/cache-a", profiles: [cached, null] }],
        localProfiles: [local("/profiles/stale.mobileprovision")],
      })
    ).toEqual({ profile: cached, source: "cache", status: "ok" });
  });

  it("flags a stale local wildcard when no runner is cached", () => {
    const stale = local("/profiles/stale.mobileprovision");
    expect(check({ localProfiles: [stale] })).toEqual({
      caches: [],
      profiles: [stale],
      status: "stale",
    });
  });

  it("passes when one local profile includes the phone", () => {
    const fresh = local("/profiles/fresh.mobileprovision", {
      devices: [NEW_PHONE],
    });
    expect(
      check({
        localProfiles: [local("/profiles/stale.mobileprovision"), fresh],
      })
    ).toEqual({ profile: fresh, source: "local", status: "ok" });
  });

  it("ignores expired, other-team, and non-matching local profiles", () => {
    expect(
      check({
        localProfiles: [
          local("/profiles/expired.mobileprovision", { expires: PAST }),
          local("/profiles/other-team.mobileprovision", {
            appId: "OTHER00000.*",
          }),
          local("/profiles/app.mobileprovision", {
            appId: `${TEAM}.com.example.app`,
          }),
        ],
        teamId: TEAM,
      })
    ).toEqual({ status: "unknown" });
  });

  it("skips unreadable cached profiles", () => {
    expect(
      check({ caches: [{ dir: "/derived/cache-a", profiles: [null] }] })
    ).toEqual({ status: "unknown" });
  });
});

describe("findRunnerCaches", () => {
  let dir = "";

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "runner-cache-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { force: true, recursive: true });
  });

  const addFile = (relative: string) => {
    const file = path.join(dir, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "");
    return file;
  };

  it("lists the profiles of signed device apps only", () => {
    const runner = addFile(
      "Build/Products/Debug-iphoneos/AgentDeviceRunner.app/embedded.mobileprovision"
    );
    const tests = addFile(
      "Build/Products/Debug-iphoneos/AgentDeviceRunnerUITests-Runner.app/embedded.mobileprovision"
    );
    addFile(
      "Build/Products/Debug-iphonesimulator/AgentDeviceRunner.app/embedded.mobileprovision"
    );
    addFile("Build/Products/Debug-iphoneos/Unsigned.app/Info.plist");
    const [cache] = findRunnerCaches(dir);
    expect(cache?.dir).toBe(dir);
    expect(cache?.files.toSorted()).toEqual([runner, tests].toSorted());
  });

  it("returns nothing for a missing folder", () => {
    expect(findRunnerCaches(path.join(dir, "missing"))).toEqual([]);
  });
});
