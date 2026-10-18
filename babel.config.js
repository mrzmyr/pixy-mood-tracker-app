const path = require("node:path");

const SRC_DIR = path.join(__dirname, "src") + path.sep;

// babel-preset-expo replaces `process.env.EXPO_OS` with the bundle platform.
// Jest bundles for iOS only, so app code under test keeps a runtime read
// instead. Tests switch platform with
// `jest.replaceProperty(process.env, "EXPO_OS", "android")`.
const runtimeExpoOs = ({ types: t }) => ({
  name: "pixy-runtime-expo-os",
  visitor: {
    MemberExpression(nodePath, state) {
      if (
        !state.filename?.startsWith(SRC_DIR) ||
        !nodePath.matchesPattern("process.env.EXPO_OS")
      ) {
        return;
      }
      nodePath.replaceWith(
        t.memberExpression(
          t.memberExpression(
            t.memberExpression(
              t.identifier("globalThis"),
              t.identifier("process")
            ),
            t.identifier("env")
          ),
          t.identifier("EXPO_OS")
        )
      );
    },
  },
});

module.exports = function exports(api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            "@": "./src",
          },
        },
      ],
      ...(process.env.NODE_ENV === "test" ? [runtimeExpoOs] : []),
    ],
  };
};
