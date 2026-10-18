import { Platform } from "react-native";
import type { TextStyle } from "react-native";

/** Size, line height, and weight of one text role. */
export type Metrics = Pick<TextStyle, "fontSize" | "lineHeight" | "fontWeight">;

const pick = (android: Metrics, ios: Metrics): Metrics =>
  Platform.OS === "android" ? android : ios;

/**
 * Size, line height, and weight per component role.
 * iOS: HIG text styles (Caption1, Footnote, Subheadline, Body, Title3, Title2, LargeTitle).
 * Android: Material 3 type scale (bodySmall, bodyMedium, bodyLarge, titleLarge, headlineSmall, displaySmall).
 * Weights stay on the pre-existing values so hierarchy does not change.
 * Read at render time, so `Platform.OS` is honored.
 */
export const getTypeMetrics = (): Record<
  | "micro"
  | "caption"
  | "secondary"
  | "body"
  | "headline"
  | "section"
  | "title"
  | "display",
  Metrics
> => ({
  /** iOS Caption1 12/16. Android bodySmall 12/16. */
  micro: { fontSize: 12, lineHeight: 16, fontWeight: "400" },
  /** iOS Footnote 13/18. Android bodySmall 12/16. */
  caption: pick(
    { fontSize: 12, lineHeight: 16, fontWeight: "400" },
    { fontSize: 13, lineHeight: 18, fontWeight: "400" }
  ),
  /** iOS Subheadline 15/20. Android bodyMedium 14/20. */
  secondary: pick(
    { fontSize: 14, lineHeight: 20, fontWeight: "400" },
    { fontSize: 15, lineHeight: 20, fontWeight: "400" }
  ),
  /** iOS Body 17/22. Android bodyLarge 16/24. */
  body: pick(
    { fontSize: 16, lineHeight: 24, fontWeight: "400" },
    { fontSize: 17, lineHeight: 22, fontWeight: "400" }
  ),
  /** iOS Headline 17/22 semibold. Android titleMedium 16/24 weight 500. */
  headline: pick(
    { fontSize: 16, lineHeight: 24, fontWeight: "500" },
    { fontSize: 17, lineHeight: 22, fontWeight: "600" }
  ),
  /** iOS Title3 20/25. Android titleLarge 22/28. */
  section: pick(
    { fontSize: 22, lineHeight: 28, fontWeight: "600" },
    { fontSize: 20, lineHeight: 25, fontWeight: "600" }
  ),
  /** iOS Title2 22/28. Android headlineSmall 24/32. */
  title: pick(
    { fontSize: 24, lineHeight: 32, fontWeight: "700" },
    { fontSize: 22, lineHeight: 28, fontWeight: "700" }
  ),
  /** iOS LargeTitle 34/41. Android displaySmall 36/44. */
  display: pick(
    { fontSize: 36, lineHeight: 44, fontWeight: "700" },
    { fontSize: 34, lineHeight: 41, fontWeight: "700" }
  ),
});
