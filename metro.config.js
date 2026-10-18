// Tree shaking drops unused exports from release bundles. Expo applies it to
// production-mode bundles only. eas.json sets both variables for EAS builds;
// this default covers local release builds (`bun ios:preview`, `expo export`).
// Set either variable to `0` to compare bundles.
if (process.env.EXPO_PUBLIC_APP_VARIANT !== "development") {
  process.env.EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH ??= "1";
  process.env.EXPO_UNSTABLE_TREE_SHAKING ??= "1";
}

const { getDefaultConfig } = require("expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.resolver.sourceExts.push("cjs");
// Licenses screen loads `assets/licenses.txt` as an asset, not as JS.
defaultConfig.resolver.assetExts.push("txt");
// Bundles inline EXPO_PUBLIC_APP_VARIANT, but Metro's transform cache does not
// key on env values. Without this, switching variants reuses another
// variant's transformed code.
defaultConfig.cacheVersion = [
  defaultConfig.cacheVersion,
  process.env.EXPO_PUBLIC_APP_VARIANT,
].join(":");
module.exports = defaultConfig;
