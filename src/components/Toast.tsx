import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Check } from "react-native-feather";
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
} from "react-native-gesture-handler";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { FullWindowOverlay } from "react-native-screens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import useColors from "@/hooks/useColors";
import { getToastDuration, hideToast, useToast } from "@/lib/toast";
import type { Toast } from "@/lib/toast";
import { RADIUS } from "@/constants/Radius";

const IS_ANDROID = Platform.OS === "android";
/** Drag distance or speed toward the screen edge that dismisses the toast. */
const DISMISS_DISTANCE = 40;
const DISMISS_VELOCITY = 500;
/** iOS toasts sit at the top and leave upward. Android snackbars sit at the bottom and leave downward. */
const EDGE = IS_ANDROID ? 1 : -1;

const ToastCard = ({ toast }: { toast: Toast }) => {
  const colors = useColors();
  const [isHeld, setIsHeld] = useState(false);
  const offset = useSharedValue(0);

  useEffect(() => {
    if (isHeld) {
      return;
    }
    const timer = setTimeout(hideToast, getToastDuration(toast, Platform.OS));
    return () => clearTimeout(timer);
  }, [isHeld, toast]);

  const pan = usePanGesture({
    onBegin: () => {
      scheduleOnRN(setIsHeld, true);
    },
    onUpdate: (event) => {
      // Follow the finger toward the edge; resist the other way.
      const toward = event.translationY * EDGE;
      offset.set(toward > 0 ? event.translationY : event.translationY * 0.15);
    },
    onDeactivate: (event) => {
      if (
        event.translationY * EDGE > DISMISS_DISTANCE ||
        event.velocityY * EDGE > DISMISS_VELOCITY
      ) {
        offset.set(
          withTiming(200 * EDGE, { duration: 180 }, () =>
            scheduleOnRN(hideToast)
          )
        );
        return;
      }
      offset.set(withSpring(0, { damping: 20 }));
    },
    onFinalize: () => {
      scheduleOnRN(setIsHeld, false);
    },
  });

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.get() }],
  }));

  return (
    <Animated.View
      entering={(IS_ANDROID ? FadeInDown : FadeInUp).duration(250)}
      exiting={(IS_ANDROID ? FadeOutDown : FadeOutUp).duration(200)}
    >
      <GestureDetector gesture={pan}>
        <Animated.View
          testID="toast"
          style={[
            dragStyle,
            {
              flexDirection: "row",
              alignItems: toast.message ? "flex-start" : "center",
              gap: 10,
              paddingVertical: 14,
              paddingHorizontal: 16,
              ...(IS_ANDROID
                ? {
                    // Material 3 snackbar: inverse surface, 4dp corners.
                    alignItems: "center",
                    minHeight: 48,
                    paddingVertical: 8,
                    borderRadius: RADIUS.xs,
                    backgroundColor: colors.snackbarBackground,
                    elevation: 6,
                  }
                : {
                    borderRadius: RADIUS.md,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    backgroundColor: colors.cardBackground,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }),
            },
          ]}
        >
          {!IS_ANDROID && (
            <Check
              width={18}
              height={18}
              strokeWidth={2.5}
              color={colors.toastSuccessIcon}
              style={{ marginTop: toast.message ? 1 : 0 }}
            />
          )}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: IS_ANDROID ? colors.snackbarText : colors.text,
              }}
            >
              {toast.title}
            </Text>
            {toast.message && (
              <Text
                style={{
                  marginTop: 2,
                  fontSize: 15,
                  color: IS_ANDROID
                    ? colors.snackbarText
                    : colors.textSecondary,
                }}
              >
                {toast.message}
              </Text>
            )}
          </View>
          {toast.action && (
            <Pressable
              testID="toast-action"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                toast.action?.onPress();
                hideToast();
              }}
              style={{ paddingHorizontal: 8, paddingVertical: 8 }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: IS_ANDROID ? colors.snackbarAction : colors.tint,
                }}
              >
                {toast.action.label}
              </Text>
            </Pressable>
          )}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

/**
 * Renders toasts from `showToast`. Mount once at the root. On iOS the
 * overlay window keeps toasts above native modals. Toasts sit at the top
 * and swipe up to dismiss. On Android they are bottom snackbars above the
 * system navigation bar and swipe down to dismiss. Announced politely.
 * The wrapper is only as tall as the toast, so touches elsewhere pass
 * through.
 */
export const ToastHost = () => {
  const toast = useToast();
  const insets = useSafeAreaInsets();

  // The overlay window has no gesture root of its own, so add one.
  const host = (
    <GestureHandlerRootView
      accessibilityLiveRegion="polite"
      style={{
        position: "absolute",
        ...(IS_ANDROID
          ? { bottom: insets.bottom + 8, left: 8, right: 8 }
          : { top: insets.top + 8, left: 12, right: 12 }),
      }}
    >
      {toast && <ToastCard key={toast.id} toast={toast} />}
    </GestureHandlerRootView>
  );
  return Platform.OS === "ios" ? (
    <FullWindowOverlay>{host}</FullWindowOverlay>
  ) : (
    host
  );
};
