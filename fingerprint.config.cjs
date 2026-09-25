// Native fingerprint settings for Expo CLI and the local build cache.
// https://docs.expo.dev/versions/latest/sdk/fingerprint/
const { SourceSkips } = require("@expo/fingerprint");

/** @type {import("@expo/fingerprint").Config} */
module.exports = {
  // package.json scripts only run tools (tests, lint, this repo's CLIs) and
  // never change the native app. Without this skip, adding a script throws
  // away every cached build.
  sourceSkips: SourceSkips.PackageJsonScriptsAll,
};
