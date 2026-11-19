import type { Preview } from "@storybook/react-native-web-vite";
import { ThemeProvider } from "expo-router";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { getNavigationTheme } from "@/shell/navigation-theme";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "App color scheme",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: ["light", "dark"],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    (Story, { globals }) => {
      const theme = getNavigationTheme(globals.theme);
      return (
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 402, height: 874 },
            insets: { top: 0, left: 0, right: 0, bottom: 0 },
          }}
        >
          <ThemeProvider value={theme}>
            <View
              style={{ backgroundColor: theme.colors.background, padding: 16 }}
            >
              <Story />
            </View>
          </ThemeProvider>
        </SafeAreaProvider>
      );
    },
  ],
};

export default preview;
