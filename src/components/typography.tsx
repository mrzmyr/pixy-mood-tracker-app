import { Text } from "react-native";
import type { TextProps, TextStyle } from "react-native";

/**
 * Line height per font size, from the Geist type scale:
 * https://vercel.com/geist/typography
 * Only these sizes exist. A size outside the scale is a type error.
 */
const SCALE = {
  heading: {
    72: 72,
    64: 64,
    56: 56,
    48: 56,
    40: 48,
    32: 40,
    24: 32,
    20: 26,
    16: 24,
    14: 20,
  },
  label: { 20: 32, 18: 20, 16: 20, 14: 20, 13: 16, 12: 16 },
  copy: { 24: 36, 20: 36, 18: 28, 16: 24, 14: 20, 13: 18 },
} as const satisfies Record<string, Record<number, number>>;

type Kind = keyof typeof SCALE;
type SizeOf<K extends Kind> = keyof (typeof SCALE)[K] & number;

/** Geist heading sizes. Weight is always 600. */
export type HeadingSize = SizeOf<"heading">;
/** Geist label sizes. Single line. */
export type LabelSize = SizeOf<"label">;
/** Geist copy sizes. Text that wraps. */
export type CopySize = SizeOf<"copy">;

/** Weight for `strong` and for every heading. */
const STRONG_WEIGHT = "600";

/**
 * Size and line height of one Geist style, for hosts that are not `Text`:
 * a multiline `TextInput`, or a third-party `textStyle` prop. Render text
 * with `Heading`, `Label`, or `Copy` instead.
 */
export const getTextStyle = <K extends Kind>(
  kind: K,
  size: SizeOf<K>,
  { strong = false }: { strong?: boolean } = {}
): TextStyle => {
  const lineHeights: Record<number, number> = SCALE[kind];
  const style: TextStyle = { fontSize: size, lineHeight: lineHeights[size] };
  if (kind === "heading" || strong) {
    style.fontWeight = STRONG_WEIGHT;
  }
  return style;
};

/**
 * Size for a single-line `TextInput`. No line height: iOS moves input text
 * down when one is set. A multiline input uses `getTextStyle("copy", size)`.
 */
export const getInputTextStyle = (size: LabelSize): TextStyle => ({
  fontSize: size,
});

type Props<K extends Kind> = TextProps & {
  size: SizeOf<K>;
  /** Weight 600. Use it for titles, not for whole paragraphs. */
  strong?: boolean;
};

const createText = <K extends Kind>(kind: K, displayName: string) => {
  const Component = ({ size, strong, style, ...props }: Props<K>) => (
    <Text {...props} style={[getTextStyle(kind, size, { strong }), style]} />
  );
  Component.displayName = displayName;
  return Component;
};

/** Introduces a page or section. Always weight 600. */
export const Heading = createText("heading", "Heading");

/** Single line of text: row titles, chips, menu items, values. */
export const Label = createText("label", "Label");

/** Text that can wrap to more lines: descriptions, hints, messages. */
export const Copy = createText("copy", "Copy");
