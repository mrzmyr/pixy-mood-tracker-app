import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { LayoutChangeEvent, TextStyle } from "react-native";
import { t } from "@/lib/translation";

/** Tolerance for subpixel rounding between the two measured widths. */
const WIDTH_TOLERANCE = 0.5;
const DEFAULT_FONT_SIZE = 16;

/**
 * Truncation state for a one-line label that can expand to full text.
 * The visible label reports its width, a hidden copy its natural width:
 * natural wider than visible means the label is cut off.
 */
export const useLabelMore = () => {
  const [visibleWidth, setVisibleWidth] = useState(0);
  const [naturalWidth, setNaturalWidth] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const isTruncated =
    !isExpanded &&
    visibleWidth > 0 &&
    naturalWidth > visibleWidth + WIDTH_TOLERANCE;

  return {
    isExpanded,
    isTruncated,
    handleExpand: () => setIsExpanded(true),
    handleVisibleLayout: (event: LayoutChangeEvent) =>
      setVisibleWidth(event.nativeEvent.layout.width),
    handleNaturalLayout: (event: LayoutChangeEvent) =>
      setNaturalWidth(event.nativeEvent.layout.width),
  };
};

/**
 * Invisible single-line copy of the label at its natural width. Absolute,
 * so it never changes the parent layout. Hidden from screen readers.
 */
export const LabelMeasure = ({
  label,
  style,
  onLayout,
}: {
  label: string;
  style: TextStyle;
  onLayout: (event: LayoutChangeEvent) => void;
}) => (
  <View
    pointerEvents="none"
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: 10_000,
      opacity: 0,
      flexDirection: "row",
    }}
  >
    <Text style={style} onLayout={onLayout}>
      {label}
    </Text>
  </View>
);

/**
 * "More" control after a cut-off label. Screen readers already get the full
 * label from the parent, so it adds no extra stop.
 */
export const LabelMoreButton = ({
  color,
  labelStyle,
  onPress,
  testID,
}: {
  color: string;
  /** Style of the cut-off label; "More" sits on its baseline, 2 pt smaller. */
  labelStyle: TextStyle;
  onPress: () => void;
  testID?: string;
}) => (
  <Pressable
    onPress={onPress}
    hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
    accessibilityRole="button"
    accessibilityLabel={t("more")}
    testID={testID}
  >
    <Text
      style={{
        fontSize: (labelStyle.fontSize ?? DEFAULT_FONT_SIZE) - 2,
        lineHeight: labelStyle.lineHeight,
        fontWeight: "600",
        color,
        opacity: 0.6,
      }}
    >
      {t("more")}
    </Text>
  </Pressable>
);
