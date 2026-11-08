import type { Preview } from "@storybook/react-native-web-vite";
import { ThemeProvider } from "expo-router";
import { View } from "react-native";

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
        <ThemeProvider value={theme}>
          <View
            style={{ backgroundColor: theme.colors.background, padding: 16 }}
          >
            <Story />
          </View>
        </ThemeProvider>
      );
    },
  ],
};

export default preview;
