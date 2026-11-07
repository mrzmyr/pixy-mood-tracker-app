import path from "node:path";

import type { StorybookConfig } from "@storybook/react-native-web-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  core: { disableTelemetry: true },
  framework: {
    name: "@storybook/react-native-web-vite",
    options: {},
  },
  viteFinal: (viteConfig) => {
    const alias = viteConfig.resolve?.alias ?? [];
    return {
      ...viteConfig,
      resolve: {
        ...viteConfig.resolve,
        alias: [
          ...(Array.isArray(alias)
            ? alias
            : Object.entries(alias).map(([find, replacement]) => ({
                find,
                replacement,
              }))),
          {
            find: /^@\//u,
            replacement: `${path.resolve(import.meta.dirname, "../src")}/`,
          },
          // Exact match only: `expo-router/react-navigation` must resolve to the package.
          {
            find: /^expo-router$/u,
            replacement: path.resolve(import.meta.dirname, "expo-router.ts"),
          },
        ],
      },
    };
  },
};

export default config;
