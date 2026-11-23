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
// Math.random before any module runs. Same gate as IS_SITEMAP_CAPTURE.
if (
  process.env.EXPO_PUBLIC_SITEMAP_CAPTURE === "1" &&
  process.env.EXPO_PUBLIC_APP_VARIANT === "preview"
) {
  const { getPolyfills } = defaultConfig.serializer;
  defaultConfig.serializer.getPolyfills = (options) => [
    ...(getPolyfills ? getPolyfills(options) : []),
    require.resolve("./scripts/sitemap/capture-polyfill.js"),
  ];
  defaultConfig.cacheVersion = `${defaultConfig.cacheVersion}:sitemap`;
  // Stubs for UI no captured state shows, see scripts/sitemap/capture-stubs.cjs.
  const stubs = require("./scripts/sitemap/capture-stubs.cjs");
  const path = require("node:path");
  const upstream = defaultConfig.resolver.resolveRequest;
  defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
    // Babel's module-resolver has already turned `@/x` into a relative path.
    const repoPath = (file) =>
      path.relative(__dirname, file).split(path.sep).join("/");
    const from = repoPath(context.originModulePath);
    const target = moduleName.startsWith(".")
      ? repoPath(
          path.resolve(path.dirname(context.originModulePath), moduleName)
        )
      : moduleName.replace(/^@\//u, "src/");
    const stub = Object.entries(stubs[from] ?? {}).find(
      ([spec]) => spec.replace(/^@\//u, "src/") === target
    )?.[1];
    if (stub) {
      return { type: "sourceFile", filePath: path.join(__dirname, stub) };
    }
    return upstream
      ? upstream(context, moduleName, platform)
      : context.resolveRequest(context, moduleName, platform);
  };
}
module.exports = defaultConfig;
