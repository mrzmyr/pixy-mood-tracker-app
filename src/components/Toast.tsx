import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { Check } from "react-native-feather";
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
} from "react-native-gesture-handler";
import Animated, {
  FadeInUp,
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
import { hideToast, useToast } from "@/lib/toast";
import type { Toast } from "@/lib/toast";

/** How long a toast stays on screen. Restarts after a drag. */
const TOAST_MS = 2600;
/** Upward drag distance or speed that dismisses the toast. */
const DISMISS_DISTANCE = 40;
const DISMISS_VELOCITY = 500;

const ToastCard = ({ toast }: { toast: Toast }) => {
  const colors = useColors();
  const [isHeld, setIsHeld] = useState(false);
  const offset = useSharedValue(0);

  useEffect(() => {
    if (isHeld) {
      return;
    }
    const timer = setTimeout(hideToast, TOAST_MS);
    return () => clearTimeout(timer);
  }, [isHeld]);

  const pan = usePanGesture({
    onBegin: () => {
      scheduleOnRN(setIsHeld, true);
    },
    onUpdate: (event) => {
      // Follow the finger up; resist downward drags.
      offset.set(
        event.translationY < 0 ? event.translationY : event.translationY * 0.15
      );
    },
    onDeactivate: (event) => {
      if (
        event.translationY < -DISMISS_DISTANCE ||
        event.velocityY < -DISMISS_VELOCITY
      ) {
        offset.set(
          withTiming(-200, { duration: 180 }, () => scheduleOnRN(hideToast))
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
      entering={FadeInUp.duration(250)}
      exiting={FadeOutUp.duration(200)}
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
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              backgroundColor: colors.cardBackground,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            },
          ]}
        >
          <Check
            width={18}
            height={18}
            strokeWidth={2.5}
            color={colors.toastSuccessIcon}
            style={{ marginTop: toast.message ? 1 : 0 }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 15, fontWeight: "600", color: colors.text }}
            >
              {toast.title}
            </Text>
            {toast.message && (
              <Text
                style={{
                  marginTop: 2,
                  fontSize: 15,
                  color: colors.textSecondary,
                }}
              >
                {toast.message}
              </Text>
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

/**
 * Renders toasts from `showToast`. Mount once at the root. On iOS the
 * overlay window keeps toasts above native modals. Swipe up dismisses.
 * The wrapper is only as tall as the toast, so touches elsewhere pass
 * through.
 */
export const ToastHost = () => {
  const toast = useToast();
  const insets = useSafeAreaInsets();

  // The overlay window has no gesture root of its own, so add one.
  const host = (
    <GestureHandlerRootView
      style={{ position: "absolute", top: insets.top + 8, left: 12, right: 12 }}
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
