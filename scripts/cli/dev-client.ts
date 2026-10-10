// Pure helpers for the dev client: dev menu preferences, dev deep links, and
// the app variant `bun app seed` targets. No device access here.
import {
  FEATURE_FLAGS,
  isFeatureFlag,
} from "../../src/state/featureFlags/keys.ts";
import { CliError } from "./shared.ts";

// expo-dev-menu shows an onboarding sheet, opens itself at launch, and draws a
// floating button over the app. These values turn all three off. Key names
// come from expo-dev-menu: `DevMenuPreferences.swift` (iOS user defaults) and
// `DevMenuPreferences.kt` (Android shared preferences, property names).
const DEV_MENU_PREFERENCES = [
  {
    ios: "EXDevMenuIsOnboardingFinished",
    android: "isOnboardingFinished",
    value: true,
  },
  { ios: "EXDevMenuShowsAtLaunch", android: "showsAtLaunch", value: false },
  {
    ios: "EXDevMenuShowFloatingActionButton",
    android: "showFab",
    value: false,
  },
] as const;

/** Shared preferences file of expo-dev-menu, relative to the app data dir. */
const ANDROID_DEV_MENU_PREFS_FILE =
  "shared_prefs/expo.modules.devmenu.sharedpreferences.xml";

/** `xcrun` argument lists that write the dev menu defaults on a simulator. */
const iosDevMenuCommands = (udid: string, bundleId: string) =>
  DEV_MENU_PREFERENCES.map(({ ios, value }) => [
    "simctl",
    "spawn",
    udid,
    "defaults",
    "write",
    bundleId,
    ios,
    "-bool",
    String(value),
  ]);

const escapeRegExp = (value: string) =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");

/**
 * Sets the dev menu keys in an Android shared preferences file. Keeps every
 * other entry. `changed` is false when the file already holds these values.
 */
const mergeAndroidDevMenuPrefs = (existing: string | undefined) => {
  let xml =
    existing?.includes("</map>") === true
      ? existing
      : "<?xml version='1.0' encoding='utf-8' standalone='yes' ?>\n<map>\n</map>\n";
  let changed = false;
  for (const { android, value } of DEV_MENU_PREFERENCES) {
    const entry = new RegExp(
      `\\s*<boolean name="${escapeRegExp(android)}" value="(true|false)" />`,
      "u"
    );
    const current = entry.exec(xml)?.[1];
    if (current === String(value)) {
      continue;
    }
    changed = true;
    xml = xml
      .replace(entry, "")
      .replace(
        "</map>",
        `    <boolean name="${android}" value="${value}" />\n</map>`
      );
  }
  return { changed, xml };
};

type FlagValue = "on" | "off";

/** Parses `--flag=<key>=<on|off>[,<key>=<on|off>...]`. */
const parseFlagOverrides = (raw: string | undefined) => {
  if (raw === undefined) {
    return [];
  }
  const overrides: { key: string; value: FlagValue }[] = [];
  for (const pair of raw.split(",")) {
    const [key = "", value, ...rest] = pair.split("=");
    const invalid = (why: string) =>
      new CliError({
        exitCode: 2,
        status: "invalid_flag",
        message: `Invalid --flag entry "${pair}"`,
        why,
        fix: "Pass --flag=<key>=<on|off>, comma separated for more flags.",
      });
    if (!isFeatureFlag(key)) {
      throw invalid(`Known flags: ${FEATURE_FLAGS.join(", ")}.`);
    }
    if ((value !== "on" && value !== "off") || rest.length > 0) {
      throw invalid("Each flag needs the value on or off.");
    }
    if (overrides.some((override) => override.key === key)) {
      throw invalid(`Flag ${key} is set twice.`);
    }
    overrides.push({ key, value });
  }
  return overrides;
};

/**
 * Dev deep links to open after the app loaded: fixture first, because a
 * fixture replaces app data, then flag overrides.
 */
const devLinks = (
  scheme: string,
  {
    fixture,
    flags = [],
  }: { fixture?: string; flags?: { key: string; value: FlagValue }[] }
) => [
  ...(fixture === undefined
    ? []
    : [`${scheme}://dev/fixture?id=${encodeURIComponent(fixture)}`]),
  ...flags.map(
    ({ key, value }) =>
      `${scheme}://dev/feature-flag?key=${encodeURIComponent(key)}&value=${value}`
  ),
];

type SeedVariant = "dev" | "preview";

/**
 * App variant for `bun app seed`. `--variant` wins. Else simulators and
 * emulators get the dev client while this checkout's `bun app dev` session
 * runs. Phones get the preview app.
 */
const pickSeedVariant = ({
  variant,
  isPhone,
  isDevSessionRunning,
}: {
  variant: string | undefined;
  isPhone: boolean;
  isDevSessionRunning: boolean;
}): SeedVariant => {
  if (variant === "dev" && isPhone) {
    throw new CliError({
      exitCode: 2,
      status: "variant_unsupported",
      message: "--variant=dev does not work with --target",
      why: "`bun app dev` runs the dev client on simulators and emulators only.",
      fix: "Pass --platform=<ios|android>, or drop --variant=dev.",
    });
  }
  if (variant === "dev" || variant === "preview") {
    return variant;
  }
  return !isPhone && isDevSessionRunning ? "dev" : "preview";
};

export {
  ANDROID_DEV_MENU_PREFS_FILE,
  devLinks,
  iosDevMenuCommands,
  mergeAndroidDevMenuPrefs,
  parseFlagOverrides,
  pickSeedVariant,
};
export type { FlagValue, SeedVariant };
