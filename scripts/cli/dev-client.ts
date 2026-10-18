// Pure helpers for the dev client: launch URL, dev deep links, and
// the app variant `bun app seed` targets. No device access here.
import {
  FEATURE_FLAGS,
  isFeatureFlag,
} from "../../src/state/featureFlags/keys.ts";
import { CliError } from "./shared.ts";

// Reserved params of an SDK 58 launch URL. expo-dev-menu saves
// `__expo_disable_onboarding` in its preferences. It applies the floating
// button and launch menu params to the app process the link starts, so every
// `bun app dev` run opens the app with this link. Source: `ExpoLauncherURL`
// in expo-dev-menu (iOS and Android).
const NO_DEV_MENU_PARAMS = [
  "__expo_disable_onboarding=1",
  "__expo_disable_fab=1",
  "__expo_disable_auto_launch=1",
].join("&");

/**
 * Launch URL that makes the dev client load from `metroUrl` with the dev menu
 * onboarding, floating button, and launch menu off. Same form as Expo CLI 58
 * `UrlCreator.constructDevClientUrl`.
 */
const devClientUrl = (scheme: string, metroUrl: string) =>
  `${scheme}://?__expo_url=${encodeURIComponent(metroUrl)}&${NO_DEV_MENU_PARAMS}`;

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

export { devClientUrl, devLinks, parseFlagOverrides, pickSeedVariant };
export type { FlagValue, SeedVariant };
