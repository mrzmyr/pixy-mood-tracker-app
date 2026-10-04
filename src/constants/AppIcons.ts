import type { ImageSourcePropType } from "react-native";

/** Stable app icon ids. Analytics sends them, so do not rename them. */
export type AppIconId =
  | "default"
  | "sunburst"
  | "sunburst-inverse"
  | "sunburst-black"
  | "sunburst-black-inverse"
  | "dither"
  | "dither-inverse"
  | "tangerine"
  | "tangerine-inverse";

/** One selectable app icon in Settings > App Icon. */
export interface AppIcon {
  id: AppIconId;
  /**
   * Name in the `expo-alternate-app-icons` plugin config in `app.json`.
   * `null` is the primary icon of the app variant.
   */
  nativeName: string | null;
  /** Shown only when the `app-icons` feature flag is on. */
  isFlagged: boolean;
  preview: ImageSourcePropType;
}

/**
 * Icons in display order. Sources live in `assets/images/app-icons/`. Keep
 * `nativeName` in sync with the plugin config in `app.json`.
 */
export const APP_ICONS: readonly AppIcon[] = [
  {
    id: "default",
    nativeName: null,
    isFlagged: false,
    preview: require("../../assets/images/app-icons/preview-default.png"),
  },
  {
    id: "sunburst",
    nativeName: "Sunburst",
    isFlagged: true,
    preview: require("../../assets/images/app-icons/preview-sunburst.png"),
  },
  {
    id: "sunburst-inverse",
    nativeName: "SunburstInverse",
    isFlagged: true,
    preview: require("../../assets/images/app-icons/preview-sunburst-inverse.png"),
  },
  {
    id: "sunburst-black",
    nativeName: "SunburstBlack",
    isFlagged: true,
    preview: require("../../assets/images/app-icons/preview-sunburst-black.png"),
  },
  {
    id: "sunburst-black-inverse",
    nativeName: "SunburstBlackInverse",
    isFlagged: true,
    preview: require("../../assets/images/app-icons/preview-sunburst-black-inverse.png"),
  },
  {
    id: "dither",
    nativeName: "Dither",
    isFlagged: true,
    preview: require("../../assets/images/app-icons/preview-dither.png"),
  },
  {
    id: "dither-inverse",
    nativeName: "DitherInverse",
    isFlagged: true,
    preview: require("../../assets/images/app-icons/preview-dither-inverse.png"),
  },
  {
    id: "tangerine",
    nativeName: "Tangerine",
    isFlagged: true,
    preview: require("../../assets/images/app-icons/preview-tangerine.png"),
  },
  {
    id: "tangerine-inverse",
    nativeName: "TangerineInverse",
    isFlagged: true,
    preview: require("../../assets/images/app-icons/preview-tangerine-inverse.png"),
  },
];
