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

interface FieldSet {
  /** Fill of a text field, search field, or text area. No border. */
  background: string;
  text: string;
  /** Placeholder, search icon, and clear button. */
  placeholder: string;
}

/**
 * The one gray of text inputs. Values come from the platform, so custom
 * fields match native search bars (`headerSearchBarOptions`) and forms.
 *
 * - iOS: `tertiarySystemFill` (see-through, reads on page, row, and sheet),
 *   `label`, and `secondaryLabel`, like `UISearchBar`.
 * - Android: Material 3 `surfaceContainerHighest`, `onSurface`, and
 *   `onSurfaceVariant` of the `MATERIAL_SEED_COLOR` palette. A test
 *   recomputes them from the seed.
 *
 * Never use a `neutral` gray for a field.
 */
export const FIELD_COLORS = {
  ios: {
    light: {
      background: "#7676801F",
      text: "#000000",
      placeholder: "#3C3C4399",
    },
    dark: {
      background: "#7676803D",
      text: "#FFFFFF",
      placeholder: "#EBEBF599",
    },
  },
  android: {
    light: { background: "#E2E2E9", text: "#1A1B20", placeholder: "#44474F" },
    dark: { background: "#33353A", text: "#E2E2E9", placeholder: "#C4C6D0" },
  },
} satisfies Record<"ios" | "android", Record<"light" | "dark", FieldSet>>;

/** Web follows iOS. */
export const fieldColors =
  Platform.OS === "android" ? FIELD_COLORS.android : FIELD_COLORS.ios;
