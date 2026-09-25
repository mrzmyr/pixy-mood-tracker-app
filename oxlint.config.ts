import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import react from "ultracite/oxlint/react";

const jsPlugins = selectJsPlugins(["react-doctor"]);

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
  },
});
