import { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import { PressableScale } from "@/components/pressable-scale";
import { RADIUS } from "@/constants/radius";
import { DURATION } from "@/constants/motion";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { iconLabel } from "../tag-icon-label";
import type { Tag } from "../tags-provider";
import { TagIcon } from "./tag-icon";

/** Box size; also the 44 pt minimum touch target. */
export const TAG_ICON_BOX_SIZE = 44;
const ICON_SIZE = 24;
const SMALL_ICON_SIZE = 20;
/** Lowest icon opacity of the loading pulse. */
const PULSE_OPACITY = 0.4;

/**
 * Tag icon in a gray box, leading the name field. Opens the icon picker.
 * Pulses while a suggestion loads.
 */
export const TagIconButton = ({
  icon,
  color,
  isSuggesting,
  placement,
  onPress,
  size = TAG_ICON_BOX_SIZE,
}: {
  icon: Tag["icon"];
  color: Tag["color"];
  isSuggesting: boolean;
  /**
   * Where the box sits. `row`: inside a white row, so the box takes the page
   * gray (DESIGN.md Color). `page`: on the page itself, chip gray.
   */
  placement: "row" | "page";
  /** Omit for a box that only shows the icon, like the picker header. */
  onPress?: () => void;
  size?: number;
}) => {
  const colors = useColors();
  const opacity = useMemo(() => new Animated.Value(1), []);
  const [isReduceMotion, setIsReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setIsReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setIsReduceMotion
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!isSuggesting || isReduceMotion) {
      opacity.stopAnimation();
      Animated.timing(opacity, {
        toValue: 1,
        duration: DURATION.fast,
        useNativeDriver: true,
      }).start();
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: PULSE_OPACITY,
          duration: DURATION.slower,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: DURATION.slower,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isSuggesting, isReduceMotion, opacity]);

  const box = {
    width: size,
    height: size,
    borderRadius: size >= TAG_ICON_BOX_SIZE ? RADIUS.md : RADIUS.sm,
    borderCurve: "continuous" as const,
    backgroundColor:
      placement === "row" ? colors.background : colors.chipBackground,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };
  const content = (
    <Animated.View style={{ opacity }}>
      <TagIcon
        icon={icon}
        color={color}
        size={size >= TAG_ICON_BOX_SIZE ? ICON_SIZE : SMALL_ICON_SIZE}
      />
    </Animated.View>
  );

  if (!onPress) {
    return (
      <View accessible={false} style={box}>
        {content}
      </View>
    );
  }

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t("tag_icon_change", { icon: iconLabel(icon) })}
      testID="tag-icon"
      onPress={onPress}
      style={box}
    >
      {content}
    </PressableScale>
  );
};
