/** One morph, like the reference: quick enough to keep up with swipes. */
export const TEXT_MORPH_DURATION_S = 0.35;

type FontWeight = "400" | "500" | "600" | "700";

/** Props of `TextMorph`. One line only: the iOS host sizes to a single line. */
export interface TextMorphProps {
  /** Single line of text. A new value morphs from the old one. */
  children: string;
  style: {
    fontSize: number;
    lineHeight: number;
    color: string;
    fontWeight?: FontWeight;
  };
  /** Changed letters roll down instead of up, for example going back in time. */
  countsDown?: boolean;
  testID?: string;
}

const SWIFT_WEIGHTS = {
  "400": "regular",
  "500": "medium",
  "600": "semibold",
  "700": "bold",
} as const;

/** SwiftUI weight for a React Native weight. Defaults to regular. */
export const toSwiftWeight = (weight: FontWeight = "400") =>
  SWIFT_WEIGHTS[weight];
