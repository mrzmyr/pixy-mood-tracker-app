import { Platform } from "react-native";

interface GroupedPair {
  /** Page and its header. */
  page: string;
  /** Row or card on the page. */
  row: string;
}

/**
 * The one gray of the app: grouped page (and its header) plus the rows on
 * it. Values come from the platform, so native lists (`SettingsForm`) and
 * React Native lists (`MenuList`) match.
 *
 * - iOS: `systemGroupedBackground` and `secondarySystemGroupedBackground`.
 * - Android: Material 3 `surface` and `surfaceContainer` of the
 *   `MATERIAL_SEED_COLOR` palette (`SchemeTonalSpot`, the scheme `@expo/ui`
 *   builds in Compose). A test recomputes them from the seed.
 *
 * Plain hex: chroma-js, Reanimated, and React Navigation need strings.
 */
export const GROUPED_COLORS = {
  ios: {
    light: { page: "#F2F2F7", row: "#FFFFFF" },
    dark: { page: "#000000", row: "#1C1C1E" },
  },
  android: {
    light: { page: "#F9F9FF", row: "#EDEDF4" },
    dark: { page: "#111318", row: "#1E1F25" },
  },
} satisfies Record<"ios" | "android", Record<"light" | "dark", GroupedPair>>;

/** Web follows iOS. */
export const groupedColors =
  Platform.OS === "android" ? GROUPED_COLORS.android : GROUPED_COLORS.ios;
