// Provisioning profiles: read them, and check they include a phone. Used by
// `bun app` for the app and for agent-device's runner app.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { tryRun } from "./shared.ts";

interface Profile {
  name: string;
  appId: string;
  devices: string[];
  isAllDevices: boolean;
  hasPush: boolean;
  expires: number;
}

type LocalProfile = Profile & { file: string };

const PROFILE_DIRS = [
  path.join(
    os.homedir(),
    "Library/Developer/Xcode/UserData/Provisioning Profiles"
  ),
  path.join(os.homedir(), "Library/MobileDevice/Provisioning Profiles"),
];

// Reads the few plist keys needed with regexes. plutil cannot convert profiles
// to JSON because they contain <date> and <data> values.
const parseProfile = (xml: string): Profile | null => {
  const read = (key: string, type: string) =>
    new RegExp(
      `<key>${key}</key>\\s*<${type}>(?<value>[^<]*)</${type}>`,
      "u"
    ).exec(xml)?.groups?.value;
  const appId = read("application-identifier", "string");
  const expires = read("ExpirationDate", "date");
  if (!appId || !expires) {
    return null;
  }
  const devices =
    /<key>ProvisionedDevices<\/key>\s*<array>(?<list>[\s\S]*?)<\/array>/u.exec(
      xml
    )?.groups?.list ?? "";
  return {
    appId,
    devices: [
      ...devices.matchAll(/<string>(?<udid>[^<]+)<\/string>/gu),
    ].flatMap((match) => match.groups?.udid ?? []),
    expires: Date.parse(expires),
    hasPush: xml.includes("<key>aps-environment</key>"),
    isAllDevices: /<key>ProvisionsAllDevices<\/key>\s*<true\/>/u.test(xml),
    name: read("Name", "string") ?? "unnamed profile",
  };
};

const readProfile = (file: string) => {
  const xml = tryRun("security", ["cms", "-D", "-i", file]);
  return xml ? parseProfile(xml) : null;
};

const readLocalProfiles = (): LocalProfile[] =>
  PROFILE_DIRS.flatMap((dir) =>
    fs.existsSync(dir)
      ? fs
          .readdirSync(dir)
          .filter((file) => file.endsWith(".mobileprovision"))
          .flatMap((file) => {
            const profile = readProfile(path.join(dir, file));
            return profile ? { ...profile, file: path.join(dir, file) } : [];
          })
      : []
  );

// application-identifier is "<team>.<bundle id>", or a wildcard like "<team>.*".
const matchesBundleId = (profile: Profile, bundleId: string) => {
  const pattern = profile.appId.slice(profile.appId.indexOf(".") + 1);
  return pattern.endsWith("*")
    ? bundleId.startsWith(pattern.slice(0, -1))
    : pattern === bundleId;
};

const includesPhone = (profile: Profile, udid: string) =>
  profile.isAllDevices || profile.devices.includes(udid);

// Xcode lists signed-in Apple IDs here. An empty list prints `( )`.
const hasXcodeAccount = () => {
  const accounts = tryRun("defaults", [
    "read",
    "com.apple.dt.Xcode",
    "DVTDeveloperAccountManagerAppleIDLists",
  ]);
  return accounts !== null && /\(\s*[^\s)]/u.test(accounts);
};

// agent-device keeps one Xcode derived data folder per runner build config.
const RUNNER_DERIVED_DIR = path.join(
  os.homedir(),
  ".agent-device/apple-runner/derived/ios-device"
);

const listDirs = (dir: string) => {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(dir, entry.name));
  } catch {
    return [];
  }
};

// Runner caches, and the profile of each signed app in them:
// <cache>/Build/Products/<config>-iphoneos/<name>.app/embedded.mobileprovision.
// `derivedPath` is AGENT_DEVICE_IOS_RUNNER_DERIVED_PATH, one cache folder.
const findRunnerCaches = (derivedPath?: string) =>
  (derivedPath ? [derivedPath] : listDirs(RUNNER_DERIVED_DIR)).flatMap(
    (dir) => {
      const files = listDirs(path.join(dir, "Build", "Products"))
        .filter((products) => products.endsWith("-iphoneos"))
        .flatMap(listDirs)
        .filter((app) => app.endsWith(".app"))
        .map((app) => path.join(app, "embedded.mobileprovision"))
        .filter((file) => fs.existsSync(file));
      return files.length ? { dir, files } : [];
    }
  );

interface RunnerCache {
  dir: string;
  // One per signed app. null: unreadable, for example while Xcode writes it.
  profiles: (Profile | null)[];
}

type RunnerSigning =
  | { status: "ok"; profile: Profile; source: "cache" | "local" }
  // No cached runner and no local profile: Xcode creates one at build time.
  | { status: "unknown" }
  // Caches or local profiles that sign the runner without the phone. iOS
  // refuses such a runner with 0xe8008012.
  | { status: "stale"; caches: string[]; profiles: LocalProfile[] };

// Decides whether agent-device's runner app installs on the phone.
// agent-device reuses a cached runner, so a cache without the phone fails even
// when a fresh profile exists. Without a usable cache, Xcode signs a new
// runner with a local profile for the runner bundle ID, mostly the team
// wildcard "iOS Team Provisioning Profile: *". Xcode keeps a stale local
// profile instead of fetching one that includes a newly registered phone.
const checkRunnerSigning = (options: {
  udid: string;
  bundleId: string;
  // Signing team. Profiles of other teams never sign the runner.
  teamId?: string;
  caches: RunnerCache[];
  localProfiles: LocalProfile[];
  now: number;
}): RunnerSigning => {
  const { udid, now } = options;
  const isUsable = (profile: Profile) =>
    profile.expires > now && includesPhone(profile, udid);
  const staleCaches = options.caches
    .filter((cache) =>
      cache.profiles.some((profile) => profile && !isUsable(profile))
    )
    .map((cache) => cache.dir);
  const candidates = options.localProfiles.filter(
    (profile) =>
      profile.expires > now &&
      matchesBundleId(profile, options.bundleId) &&
      (!options.teamId || profile.appId.startsWith(`${options.teamId}.`))
  );
  const localCovering = candidates.find((profile) =>
    includesPhone(profile, udid)
  );
  const staleProfiles = localCovering ? [] : candidates;
  if (staleCaches.length) {
    return { caches: staleCaches, profiles: staleProfiles, status: "stale" };
  }
  const cached = options.caches
    .flatMap((cache) => cache.profiles)
    .find((profile) => profile !== null);
  if (cached) {
    return { profile: cached, source: "cache", status: "ok" };
  }
  if (localCovering) {
    return { profile: localCovering, source: "local", status: "ok" };
  }
  return staleProfiles.length
    ? { caches: [], profiles: staleProfiles, status: "stale" }
    : { status: "unknown" };
};

/** Reads provisioning profiles and checks they include a phone. */
export {
  PROFILE_DIRS,
  RUNNER_DERIVED_DIR,
  checkRunnerSigning,
  findRunnerCaches,
  hasXcodeAccount,
  includesPhone,
  matchesBundleId,
  parseProfile,
  readLocalProfiles,
  readProfile,
};
export type { LocalProfile, Profile, RunnerCache, RunnerSigning };
