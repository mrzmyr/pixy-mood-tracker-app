const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// Adds debug IDs, so Sentry matches uploaded source maps to the bundle.
const defaultConfig = getSentryExpoConfig(__dirname);
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
// Sitemap capture bundles (`bun sitemap capture`) freeze the clock and seed
// Math.random before any module runs.
if (process.env.EXPO_PUBLIC_SITEMAP_CAPTURE === "1") {
  const { getPolyfills } = defaultConfig.serializer;
  defaultConfig.serializer.getPolyfills = (options) => [
    ...(getPolyfills ? getPolyfills(options) : []),
    require.resolve("./scripts/sitemap/capture-polyfill.js"),
  ];
  defaultConfig.cacheVersion = `${defaultConfig.cacheVersion}:sitemap`;
}
module.exports = defaultConfig;
