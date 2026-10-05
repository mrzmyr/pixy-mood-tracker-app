// Closed preview app command specifications.
import { FIXTURES } from "../../src/dev/fixtures/index.ts";
import { buildFor } from "./app-build.ts";
import { devFor } from "./app-dev.ts";
import { installFor } from "./app-install.ts";
import { closeFor, openFor, seedFor } from "./app-session.ts";
import {
  DEVICE_ERRORS,
  DEVICE_OPTIONS,
  PLATFORM_OPTION_SPEC,
  TARGET_OPTION_SPEC,
} from "./options.ts";
import { defineCommand } from "./shared.ts";
import type { Noun } from "./shared.ts";

const FIXTURE_IDS = FIXTURES.map((fixture) => fixture.id);

// app-session builds phone runner commands with prepareRunnerArgs.
export { prepareIosRunner } from "./app-session.ts";

const APP: Noun = {
  commands: {
    build: defineCommand({
      options: {
        platform: {
          ...PLATFORM_OPTION_SPEC,
          description: ["Build for simulator (ios) or emulator (android)."],
        },
        target: {
          ...TARGET_OPTION_SPEC,
          description: [
            "Build for this phone. Copy the value from `bun devices list`.",
            "iPhone: signed phone build. Android phone: same build as emulator.",
          ],
        },
      },
      exactlyOne: ["platform", "target"],
      sections: [
        { title: "Output", lines: ["Build ID on stdout. Log path on stderr."] },
        {
          title: "Examples",
          lines: [
            "bun app build --platform=ios",
            "bun app build --target=pixel-8-09yw",
          ],
        },
      ],
      errors: {
        missing_option: "Neither --platform nor --target passed",
        conflicting_options: "Both --platform and --target passed",
        invalid_platform: "--platform is not ios or android",
        target_not_found: "No connected phone has this target",
        signing_team_missing: "No Apple Development team to sign with",
        signing_profile_missing: "Provisioning profile lacks this iPhone",
        native_build_failed: "Compiler failed, read the log",
        build_lock_timeout: "Another build held the cache lock 30 minutes",
        build_slot_timeout: "Two other native builds held all slots 90 minutes",
        disk_low: "Less than 10 GiB free disk, run `bun builds reclaim`",
      },
      run: (values) => buildFor(values),
      summary: "Build the preview app into the shared cache.",
    }),
    install: defineCommand({
      options: DEVICE_OPTIONS,
      exactlyOne: ["platform", "target"],
      sections: [
        {
          title: "Examples",
          lines: [
            "bun app install --platform=android",
            "bun app install --target=pixel-8-09yw",
          ],
        },
      ],
      errors: {
        ...DEVICE_ERRORS,
        signing_profile_missing: "Provisioning profile lacks this iPhone",
        install_failed: "Device refused the build",
        disk_low: "Less than 10 GiB free disk, run `bun builds reclaim`",
      },
      run: (values) => installFor(values),
      summary:
        "Install the preview app on one device. Builds first when cache has no match.",
    }),
    open: defineCommand({
      options: DEVICE_OPTIONS,
      exactlyOne: ["platform", "target"],
      sections: [
        {
          title: "Requires",
          lines: [
            "Preview app installed. Run `bun app install` with the same device option first.",
          ],
        },
        { title: "Output", lines: ["Screenshot path on stdout."] },
        {
          title: "Examples",
          lines: [
            "bun app open --platform=ios",
            "bun app open --target=pixel-8-09yw",
          ],
        },
      ],
      errors: {
        ...DEVICE_ERRORS,
        ios_runner_not_ready: "agent-device runner did not start on iPhone",
        app_not_ready: "First screen did not appear in 120 seconds",
      },
      run: (values) => openFor(values),
      summary: "Open the preview app and capture its first screen.",
    }),
    seed: defineCommand({
      options: {
        ...DEVICE_OPTIONS,
        fixture: {
          value: "<id>",
          description: [`Required. One of: ${FIXTURE_IDS.join(", ")}.`],
          isRequired: true,
          choices: FIXTURE_IDS,
          invalidStatus: "fixture_not_found",
        },
        variant: {
          value: "<dev|preview>",
          description: [
            "App to seed. Default: dev while this checkout's `bun app dev` runs,",
            "else preview. Phones: preview only.",
          ],
          choices: ["dev", "preview"],
        },
      },
      exactlyOne: ["platform", "target"],
      sections: [
        {
          title: "Requires",
          lines: [
            "preview: run `bun app install` with the same device option first.",
            "dev: run `bun app dev --platform=<ios|android>` first.",
          ],
        },
        { title: "Output", lines: ["Screenshot path on stdout."] },
        {
          title: "Examples",
          lines: [
            "bun app seed --platform=ios --fixture=year",
            "bun app seed --target=pixel-8-09yw --fixture=empty",
          ],
        },
      ],
      errors: {
        ...DEVICE_ERRORS,
        missing_option:
          "Neither --platform nor --target passed, or no --fixture",
        fixture_not_found: "--fixture has no match",
        variant_unsupported: "--variant=dev passed with --target",
        dev_session_missing: "--variant=dev passed, but Metro is not running",
        app_not_ready: "First screen did not appear in 120 seconds",
      },
      run: (values) => seedFor(values),
      summary: "Load a fixture and capture its first screen.",
    }),
    close: defineCommand({
      options: DEVICE_OPTIONS,
      exactlyOne: ["platform", "target"],
      sections: [
        {
          title: "Behavior",
          lines: [
            "Simulator, emulator  Reset data, shut down device, stop this checkout's Metro,",
            "                     prune old builds.",
            "Phone                Stop app, remove preview app data, prune old builds.",
            "                     Phone stays on. No other app is touched.",
          ],
        },
        {
          title: "Examples",
          lines: [
            "bun app close --platform=android",
            "bun app close --target=pixel-8-09yw",
          ],
        },
      ],
      errors: {
        ...DEVICE_ERRORS,
        app_clear_failed: "App data was not removed",
        simulator_shutdown_timeout: "Simulator did not shut down in 30 seconds",
        simulator_erase_failed: "Simulator was not erased",
      },
      run: (values) => closeFor(values),
      summary: "Stop the preview app and reset its data.",
    }),
    dev: defineCommand({
      options: {
        platform: {
          ...PLATFORM_OPTION_SPEC,
          description: [
            "Required. Simulator (ios) or emulator (android) of this checkout.",
            "CLI creates and boots it. Phones: use `bun ios --device <udid>`.",
          ],
          isRequired: true,
        },
        fixture: {
          value: "<id>",
          description: [
            `Load a fixture after launch. One of: ${FIXTURE_IDS.join(", ")}.`,
          ],
          choices: FIXTURE_IDS,
          invalidStatus: "fixture_not_found",
        },
        flag: {
          value: "<key>=<on|off>,...",
          description: [
            "Override feature flags after launch, until the app restarts.",
          ],
        },
      },
      usage:
        "Usage: bun app dev --platform=<ios|android> [--fixture=<id>] [--flag=<key>=<on|off>,...]",
      sections: [
        {
          title: "Behavior",
          lines: [
            "Build  Reuses the cached dev client for this native fingerprint. All worktrees",
            "       with the same native dependencies share it. Builds only on a miss.",
            "Metro  Starts `bun start` for this checkout on its own port (8082-8181),",
            "       detached. Reuses it when it already runs. `bun app close` stops it.",
            "Menu   Hides the dev menu onboarding, launch menu, and floating button.",
            "Open   Deep links the dev client to this Metro and waits for the first bundle.",
            "       Edits reload in the app. Rerun the command to reload by hand.",
            "Links  Opens --fixture, then --flag deep links in the running app.",
          ],
        },
        {
          title: "Output",
          lines: [
            "Screenshot path on stdout. Build ID, Metro port, and log path on stderr.",
          ],
        },
        {
          title: "Examples",
          lines: [
            "bun app dev --platform=ios",
            "bun app dev --platform=android --fixture=year --flag=people=on,photos=off",
          ],
        },
      ],
      errors: {
        missing_option: "No --platform passed",
        invalid_platform: "--platform is not ios or android",
        fixture_not_found: "--fixture has no match",
        invalid_flag: "--flag has an unknown key or a value other than on, off",
        native_build_failed: "Compiler failed, read the log",
        build_lock_timeout: "Another build held the cache lock 30 minutes",
        build_slot_timeout: "Two other native builds held all slots 90 minutes",
        disk_low: "Less than 10 GiB free disk, run `bun builds reclaim`",
        install_failed: "Device refused the build",
        metro_port_taken:
          "Another process answers on this checkout's Metro port",
        metro_start_failed: "Metro did not answer in 120 seconds",
        dev_client_open_failed: "Deep link to the dev client failed",
        bundle_failed: "Metro could not bundle the app",
        bundle_timeout: "App did not load its bundle in 180 seconds",
        dev_link_failed: "Fixture or flag deep link failed",
      },
      run: (values) => devFor(values),
      summary:
        "Run the dev client with Metro. Installs the cached dev client, starts this checkout's Metro, opens the app.",
    }),
  },
  summary:
    "Build, install, seed, open, and close the preview app. Run the dev client with Metro.",
  commandOrder: ["build", "install", "seed", "open", "close", "dev"],
  helpTail: [
    "Every command needs one device. Pass exactly one:\n  --platform=<ios|android>  Simulator or emulator of this checkout\n  --target=<target>         One phone from `bun devices list`",
    "Run `bun app <command> --help` for details.",
  ],
};

/** Closed preview app commands. */
export { APP };
