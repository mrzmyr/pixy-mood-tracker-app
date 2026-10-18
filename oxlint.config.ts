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

// Metro does not tree-shake: one barrel import bundles every Lucide icon.
const iconImports = [
  {
    name: "lucide-react-native",
    allowTypeImports: true,
    message:
      'Import each icon from "lucide-react-native/icons/<kebab-name>" instead.',
  },
  {
    name: "react-native-feather",
    message: 'Use Lucide: "lucide-react-native/icons/<kebab-name>".',
  },
];

const featureImport = {
  group: ["@/features", "@/features/**"],
  message: "Lower layer must not import features.",
};

// Production bundles drop dev tools only behind the `DEV_TOOLS` gate in `src/dev/index.ts`.
const devImport = {
  group: ["@/dev", "@/dev/**"],
  message: "Lower layer must not import dev tools.",
};

// Features expose `index.ts` (providers, hooks, logic) and `routes.ts` (screens).
const featureDeepImport = {
  group: ["@/features/*/**", "!@/features/*/routes"],
  message: "Import features through their entry file.",
};

// Startup code imports only feature `index.ts`. `routes.ts` re-exports every screen, so importing it evaluates them all.
// Regex, not a group: oxlint merges group negations across patterns, so `featureDeepImport` would allow `routes` here.
const startupFeatureImport = {
  regex: "^@/features/[^/]+/.+",
  message:
    "Startup code imports features through index.ts only. Screens load per route from routes.ts.",
};

const devDeepImport = {
  regex: "^@/dev/.+",
  message:
    "Import dev tools through `DEV_TOOLS` from `@/dev`; deep imports ship dev code in production bundles.",
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
    // Generated store screenshot prototypes (built by build.py), not app code.
    "docs/store-screenshots/**",
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
    "no-restricted-imports": [
      "error",
      { paths: iconImports, patterns: [reactNavigationImport] },
    ],
  },
  overrides: [
    {
      // Core layers never import upward into support, features, or dev tools.
      files: [
        "src/state/**",
        "src/hooks/**",
        "src/lib/**",
        "src/constants/**",
        "src/types/**",
      ],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: iconImports,
            patterns: [
              {
                group: ["@/support", "@/support/**"],
                message: "Core layer must not import support.",
              },
              featureImport,
              devImport,
              reactNavigationImport,
            ],
          },
        ],
      },
    },
    {
      // Shared UI and the support layer sit below features and dev tools.
      files: ["src/components/**", "src/support/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: iconImports,
            patterns: [featureImport, devImport, reactNavigationImport],
          },
        ],
      },
    },
    {
      // Feature consumers use `index.ts`, or `routes.ts` for screens; dev tools only via the `DEV_TOOLS` gate.
      files: ["src/features/**", "src/shell/**", "src/app/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: iconImports,
            patterns: [featureDeepImport, devDeepImport, reactNavigationImport],
          },
        ],
      },
    },
    {
      // Startup code evaluates at launch. Screens load lazily per route, so keep them out.
      files: [
        "src/shell/**",
        "src/app/_layout.tsx",
        "src/app/**/_layout.tsx",
        "src/features/**/*Provider.tsx",
      ],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: iconImports,
            patterns: [
              startupFeatureImport,
              devDeepImport,
              reactNavigationImport,
            ],
          },
        ],
      },
    },
    {
      // Dev tools may import their own files, but features only through entry files.
      files: ["src/dev/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: iconImports,
            patterns: [featureDeepImport, reactNavigationImport],
          },
        ],
      },
    },
    {
      // Tests never ship, so they may reach into features and dev fixtures.
      files: ["src/**/__tests__/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          { paths: iconImports, patterns: [reactNavigationImport] },
        ],
      },
    },
    {
      // Feature entry files intentionally re-export public symbols.
      files: ["src/features/*/index.ts"],
      rules: {
        "oxc/no-barrel-file": "off",
        "no-restricted-imports": [
          "error",
          {
            paths: iconImports,
            patterns: [
              {
                group: ["./routes", "./screens/**"],
                message:
                  "Export screens from routes.ts. index.ts loads at startup through providers and hooks.",
              },
              devDeepImport,
              reactNavigationImport,
            ],
          },
        ],
      },
    },
    {
      // Feature route entries intentionally re-export screens.
      files: ["src/features/*/routes.ts"],
      rules: { "oxc/no-barrel-file": "off" },
    },
    {
      // App code runs on Hermes and Fabric; scripts run on Bun and Node.
      files: ["src/**"],
      rules: {
        "pixy-standards/no-hermes-missing-array-methods": "error",
        "pixy-standards/no-hermes-missing-intl": "error",
        "pixy-standards/no-layout-animation": "error",
        "pixy-standards/prefer-react-use": "error",
      },
    },
    {
      // Append-only lists conflict on every merge; sorted lists do not.
      files: ["src/state/featureFlags/keys.ts"],
      rules: { "pixy-standards/sorted-string-arrays": "error" },
    },
  ],
});
