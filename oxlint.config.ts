import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import react from "ultracite/oxlint/react";

const jsPlugins = selectJsPlugins(["react-doctor"]);

// Expo Router 57 fails the bundle when app code imports React Navigation directly.
const reactNavigationImport = {
  group: ["@react-navigation/*"],
  message: "Import from expo-router/react-navigation instead.",
};

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
    // Autofix turns string `.includes` into `new Set(string).has`, which never matches a phrase.
    "unicorn/prefer-set-has": "off",
    // Autofix renames to `error` even when that shadows an outer `error`, changing which value code reads.
    "unicorn/catch-error-name": "off",
    "no-restricted-imports": ["error", { patterns: [reactNavigationImport] }],
  },
  overrides: [
    {
      // Lower layers never import upward into feature screens or logic.
      files: [
        "src/state/**",
        "src/components/**",
        "src/hooks/**",
        "src/lib/**",
        "src/helpers/**",
        "src/constants/**",
        "src/types/**",
      ],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@/features/**", "@/screens/**"],
                message: "Lower layer must not import features or screens.",
              },
              reactNavigationImport,
            ],
          },
        ],
      },
    },
    {
      // Feature consumers use public entry files.
      files: ["src/features/**", "src/shell/**", "src/app/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                regex: "^@/features/[^/]+/.+",
                message: "Import features through their entry file.",
              },
              reactNavigationImport,
            ],
          },
        ],
      },
    },
    {
      // Feature entry files intentionally re-export public symbols.
      files: ["src/features/*/index.ts"],
      rules: { "oxc/no-barrel-file": "off" },
    },
    {
      // App code runs on Hermes and Fabric; scripts run on Bun and Node.
      files: ["src/**"],
      rules: {
        "pixy-standards/no-hermes-missing-array-methods": "error",
        "pixy-standards/no-layout-animation": "error",
      },
    },
    {
      // Append-only lists conflict on every merge; sorted lists do not.
      files: ["src/state/featureFlags/keys.ts"],
      rules: { "pixy-standards/sorted-string-arrays": "error" },
    },
  ],
});
