import { Icon } from "@expo/ui";

/**
 * Settings row icons: SF Symbols on iOS, Material Symbols on Android.
 * `Icon.select` lets the `@expo/ui` Babel plugin drop the other platform.
 */
export const SETTINGS_ICONS = {
  data: Icon.select({
    ios: "externaldrive",
    android: import("@expo/material-symbols/database.xml"),
  }),
  reminder: Icon.select({
    ios: "bell",
    android: import("@expo/material-symbols/notifications.xml"),
  }),
  steps: Icon.select({
    ios: "checkmark.circle",
    android: import("@expo/material-symbols/check_circle.xml"),
  }),
  recaps: Icon.select({
    ios: "square.stack",
    android: import("@expo/material-symbols/layers.xml"),
  }),
  theme: Icon.select({
    ios: "circle.lefthalf.filled",
    android: import("@expo/material-symbols/contrast.xml"),
  }),
  appIcon: Icon.select({
    ios: "app",
    android: import("@expo/material-symbols/apps.xml"),
  }),
  // Droplet means Menstruation; color themes use a palette.
  colors: Icon.select({
    ios: "paintpalette",
    android: import("@expo/material-symbols/palette.xml"),
  }),
  requestFeature: Icon.select({
    ios: "lightbulb",
    android: import("@expo/material-symbols/lightbulb.xml"),
  }),
  voteFeatures: Icon.select({
    ios: "arrow.up.circle",
    android: import("@expo/material-symbols/arrow_circle_up.xml"),
  }),
  reportBug: Icon.select({
    ios: "ladybug",
    android: import("@expo/material-symbols/bug_report.xml"),
  }),
  rate: Icon.select({
    ios: "star",
    android: import("@expo/material-symbols/star.xml"),
  }),
  changelog: Icon.select({
    ios: "book",
    android: import("@expo/material-symbols/menu_book.xml"),
  }),
  privacy: Icon.select({
    ios: "hand.raised",
    android: import("@expo/material-symbols/privacy_tip.xml"),
  }),
  licenses: Icon.select({
    ios: "rosette",
    android: import("@expo/material-symbols/license.xml"),
  }),
  openSource: Icon.select({
    ios: "chevron.left.forwardslash.chevron.right",
    android: import("@expo/material-symbols/code.xml"),
  }),
  onboarding: Icon.select({
    ios: "iphone",
    android: import("@expo/material-symbols/mobile.xml"),
  }),
  featureFlags: Icon.select({
    ios: "flag",
    android: import("@expo/material-symbols/flag.xml"),
  }),
  statistics: Icon.select({
    ios: "chart.pie",
    android: import("@expo/material-symbols/pie_chart.xml"),
  }),
  playground: Icon.select({
    ios: "square.grid.2x2",
    android: import("@expo/material-symbols/widgets.xml"),
  }),
};
