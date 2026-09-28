const { getDefaultConfig } = require("expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.resolver.sourceExts.push("cjs");
// Bundles inline EXPO_PUBLIC_APP_VARIANT, but Metro's transform cache does not
// key on env values. Without this, switching variants reuses another
// variant's transformed code.
defaultConfig.cacheVersion = [
  defaultConfig.cacheVersion,
  process.env.EXPO_PUBLIC_APP_VARIANT,
].join(":");
module.exports = defaultConfig;
