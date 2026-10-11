import { useEffect, useEffectEvent } from "react";
import { Pressable, Text } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { t } from "@/lib/translation";
import { MAX_PHOTOS_PER_ENTRY } from "../storage";
import { RADIUS } from "@/constants/Radius";

const VISIBLE_MS = 4000;
// Dark bar on any background, like the system snackbar, in both schemes.
const BACKGROUND = "#1c1c1e";
const FOREGROUND = "white";
const ACTION = "#6cb4ff";

/**
 * Snackbar of the photos step at the photo limit: says how to swap a photo
 * instead of a blocking alert. Hides after 4 s or on OK. Place it at the
 * bottom of the step, above the footer. Fades only, so reduced motion
 * needs no other variant.
 */
export const PhotoLimitNotice = ({
  isVisible,
  onHide,
  bottom,
}: {
  isVisible: boolean;
  onHide: () => void;
  /** Distance from the bottom of the step. */
  bottom: number;
}) => {
  // Effect event: a new `onHide` on each render must not restart the timer.
  const hide = useEffectEvent(onHide);
  useEffect(() => {
    if (!isVisible) {
      return;
    }
    const timeout = setTimeout(() => hide(), VISIBLE_MS);
    return () => clearTimeout(timeout);
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      testID="photos-limit-notice"
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      accessibilityLiveRegion="polite"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingLeft: 16,
        paddingRight: 4,
        paddingVertical: 4,
        borderRadius: RADIUS.md,
        backgroundColor: BACKGROUND,
      }}
    >
      <Text
        style={{
          flex: 1,
          paddingVertical: 8,
          color: FOREGROUND,
          fontSize: 14,
          lineHeight: 19,
        }}
      >
        {t("photos_limit_reached", { max: MAX_PHOTOS_PER_ENTRY })}
      </Text>
      <Pressable
        testID="photos-limit-notice-ok"
        onPress={onHide}
        accessibilityRole="button"
        style={({ pressed }) => ({
          minWidth: 44,
          minHeight: 44,
          paddingHorizontal: 12,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ color: ACTION, fontSize: 15, fontWeight: "600" }}>
          {t("photos_limit_ok")}
        </Text>
      </Pressable>
    </Animated.View>
  );
};
