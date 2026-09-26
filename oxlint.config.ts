import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import react from "ultracite/oxlint/react";

const jsPlugins = selectJsPlugins(["react-doctor"]);

/**
 * Oxlint config: Ultracite presets plus the local `pixy-standards` rules
 * from `tools/oxlint/pixy-rules.cjs`.
 */
export default defineConfig({
  extends: [core, react, antiSlop, jsPlugins],
  ignorePatterns: [
    ...core.ignorePatterns,
    ".agents/**",
    ".claude/**",
    ".codex/**",
  ],
  jsPlugins: [
    ...jsPlugins.jsPlugins,
    { name: "pixy-standards", specifier: "./tools/oxlint/pixy-rules.cjs" },
  ],
  settings: jsPluginSettings,
  rules: {
    "pixy-standards/boolean-function-prefix": "error",
    "pixy-standards/require-exported-jsdoc": "error",
    "pixy-standards/structured-thrown-errors": "error",
    // Expo components follow React Native's PascalCase file convention.
    "unicorn/filename-case": "off",
    // React Native has no CSS classes; inline style objects are standard.
    "react-doctor/no-inline-exhaustive-style": "off",
    // Alphabetical order hides ordinal data such as rating scales.
    "sort-keys": "off",
    // React Native loads assets with require(); Metro, Babel, and scripts are CommonJS.
    "node/global-require": "off",
    "unicorn/prefer-module": "off",
    // Hermes has no Array#toSorted or Array#toReversed; copy with spread first.
    "unicorn/no-array-sort": "off",
    "unicorn/no-array-reverse": "off",
  },
  overrides: [
    {
      // App code runs on Hermes; scripts run on Bun and Node.
      files: ["src/**", "App.tsx"],
      rules: {
        "pixy-standards/no-hermes-missing-array-methods": "error",
        // Log through `@/lib/logger`, which picks console or Sentry.
        "no-console": "error",
        "no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "@sentry/react-native",
                message:
                  "Report errors with `logger.error` from `@/lib/logger`.",
              },
            ],
          },
        ],
      },
    },
    {
      // The logger itself, Sentry.init, and tests that assert on the SDKs.
      files: [
        "src/lib/logger.ts",
        "src/navigation/index.tsx",
        "src/__tests__/**",
        "src/__mocks__/**",
      ],
      rules: { "no-console": "off", "no-restricted-imports": "off" },
    },
  ],
});
