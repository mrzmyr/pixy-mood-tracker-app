// Native fingerprint settings for Expo CLI and the local build cache.
// https://docs.expo.dev/versions/latest/sdk/fingerprint/
//
// SDK 58 default preset is `balanced`. It hashes native modules and config
// plugins by package name and version, not by their files. Risk: an edit
// inside node_modules (bun `patchedDependencies`, hand edits) keeps the same
// hash, so the build cache serves a stale binary. After such an edit, remove
// the cached build (`bun builds rm --build=<id>`) or set `preset: "strict"`.
//
// `sourceSkips` below replaces the preset's skips, so app version, eas.json,
// and runtime version still change the hash, as before SDK 58.
const { SourceSkips } = require("@expo/fingerprint");

/** @type {import("@expo/fingerprint").Config} */
module.exports = {
  // package.json scripts only run tools (tests, lint, this repo's CLIs) and
  // never change the native app. Without this skip, adding a script throws
  // away every cached build.
  sourceSkips: SourceSkips.PackageJsonScriptsAll,
};
