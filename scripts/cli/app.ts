// Closed preview app command specifications.
import { FIXTURES } from "../../src/dev/fixtures/index.ts";
import { buildFor } from "./app-build.ts";
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
          description: [
            `Required. One of: ${FIXTURES.map((fixture) => fixture.id).join(", ")}.`,
          ],
          isRequired: true,
          choices: FIXTURES.map((fixture) => fixture.id),
          invalidStatus: "fixture_not_found",
        },
      },
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
            "Simulator, emulator  Reset data, shut down device, prune old builds.",
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
  },
  summary: "Build, install, seed, open, and close the preview app.",
  commandOrder: ["build", "install", "seed", "open", "close"],
  helpTail: [
    "Every command needs one device. Pass exactly one:\n  --platform=<ios|android>  Simulator or emulator of this checkout\n  --target=<target>         One phone from `bun devices list`",
    "Run `bun app <command> --help` for details.",
  ],
};

/** Closed preview app commands. */
export { APP };
