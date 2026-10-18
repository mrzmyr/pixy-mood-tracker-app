// Release checks that run before a store build.
import { PLATFORM_OPTION_SPEC } from "./options.ts";
import { RELEASE_PROFILES, WATCH_SECONDS, smokeFor } from "./release-smoke.ts";
import { defineCommand } from "./shared.ts";
import type { Noun } from "./shared.ts";

const RELEASE: Noun = {
  commands: {
    smoke: defineCommand({
      options: {
        platform: {
          ...PLATFORM_OPTION_SPEC,
          description: [
            "Required. ios: simulator of this checkout. CLI boots it.",
            "android: fails with platform_not_supported.",
          ],
          isRequired: true,
        },
        profile: {
          value: "<production|preview>",
          description: [
            "eas.json build profile. Its env goes to the JS export.",
            "Default: production.",
          ],
          choices: RELEASE_PROFILES,
        },
      },
      usage:
        "Usage: bun release smoke --platform=<ios|android> [--profile=<production|preview>]",
      sections: [
        {
          title: "Behavior",
          lines: [
            "Export  `expo export` of the release JS with the eas.json profile env.",
            "        Fresh Metro cache. No native compile.",
            "Patch   Copies the cached iOS Release simulator build, prefers the current",
            "        native fingerprint. Swaps in the exported JS and assets.",
            "Launch  Installs on this checkout's simulator, watches the app log",
            `        ${WATCH_SECONDS} seconds. Fails on a fatal JS error or when the app quits.`,
            "Clean   Removes the patched app. Run `bun app install` for the preview app.",
          ],
        },
        {
          title: "Requires",
          lines: [
            "One cached iOS Release simulator build. Run `bun app build --platform=ios` once.",
          ],
        },
        { title: "Output", lines: ["Screenshot path on stdout."] },
        {
          title: "Examples",
          lines: [
            "bun release smoke --platform=ios",
            "bun release smoke --platform=ios --profile=preview",
          ],
        },
      ],
      errors: {
        missing_option: "No --platform passed",
        invalid_platform: "--platform is not ios or android",
        invalid_value: "--profile is not production or preview",
        platform_not_supported: "--platform=android passed",
        release_build_missing: "No cached iOS Release simulator build",
        eas_profile_invalid: "eas.json lacks the profile",
        export_failed: "`expo export` failed, read the log",
        export_bundle_missing: "Export produced no single iOS bundle",
        codesign_failed: "Patched app could not be re-signed",
        install_failed: "Simulator refused the patched app",
        launch_crashed: "App logged a fatal error at launch",
        launch_exited: `App quit within ${WATCH_SECONDS} seconds, no fatal log line`,
        disk_low:
          "Less than 10 GiB free disk, follow the error fix steps to free disk",
      },
      steps: [
        "Resolve build",
        "Export JS",
        "Patch app",
        "Install",
        "Launch",
        "Watch",
      ],
      successWord: "pass",
      run: (values) => smokeFor(values),
      summary:
        "Launch the release JS bundle in a cached Release app. Catches startup crashes in minutes, no native compile.",
    }),
  },
  summary: "Checks to run before a store release.",
};

/** `bun release` commands. */
export { RELEASE };
