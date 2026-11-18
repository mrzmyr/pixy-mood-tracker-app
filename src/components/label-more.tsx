import { useContext, useState } from "react";
import { Text, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import type { LayoutChangeEvent, TextStyle } from "react-native";
import { t } from "@/lib/translation";
import { HostWidthContext } from "./host-width-context";

/** Tolerance for subpixel rounding between measured widths. */
const WIDTH_TOLERANCE = 0.5;
const DEFAULT_FONT_SIZE = 16;

/**
 * Truncation state for a one-line label that can expand to full text.
 * The visible label reports its position and width, a hidden copy its
 * natural width: natural wider than the room means the label is cut off.
 *
 * `endInset`: space between the label room and the container end (padding
 * and border). `moreGap`: space before "More". Both only count inside a
 * host, where the label gets `maxWidth`.
 */
export const useLabelMore = ({
  endInset,
  moreGap,
}: {
  endInset: number;
  moreGap: number;
}) => {
  const hostWidth = useContext(HostWidthContext);
  const [visible, setVisible] = useState({ x: 0, width: 0 });
  const [naturalWidth, setNaturalWidth] = useState(0);
  const [moreWidth, setMoreWidth] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const room =
    hostWidth === undefined ? visible.width : hostWidth - visible.x - endInset;
  const isTruncated =
    !isExpanded && room > 0 && naturalWidth > room + WIDTH_TOLERANCE;
  const maxWidth =
    hostWidth === undefined
      ? undefined
      : room - (isTruncated ? moreWidth + moreGap : 0);

  return {
    isExpanded,
    isTruncated,
    /** Label width limit inside a host. Undefined outside a host. */
    maxWidth,
    handleExpand: () => setIsExpanded(true),
    handleVisibleLayout: (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      setVisible((current) =>
        current.x === x && current.width === width ? current : { x, width }
      );
    },
    handleNaturalLayout: (event: LayoutChangeEvent) =>
      setNaturalWidth(event.nativeEvent.layout.width),
    handleMoreLayout: (event: LayoutChangeEvent) =>
      setMoreWidth(event.nativeEvent.layout.width),
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
 * "More" control after a cut-off label. Gesture handler `Pressable`, so it
 * wins the touch over a parent gesture handler button (`RectButton`).
 */
export const LabelMoreButton = ({
  color,
  labelStyle,
  onPress,
  onLayout,
  testID,
}: {
  color: string;
  /** Style of the cut-off label; "More" uses its line height, 2 pt smaller. */
  labelStyle: TextStyle;
  onPress: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
  testID?: string;
}) => (
  <Pressable
    onPress={onPress}
    onLayout={onLayout}
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
