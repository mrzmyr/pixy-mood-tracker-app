import { useEffect } from "react";
import { Platform, Text, View } from "react-native";
import { CheckCircle } from "react-native-feather";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { FullWindowOverlay } from "react-native-screens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "@/hooks/useColors";
import { hideToast, useToast } from "@/lib/toast";
import type { Toast } from "@/lib/toast";

/** How long a toast stays on screen. */
const TOAST_MS = 2600;

const ToastCard = ({ toast }: { toast: Toast }) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Keyed by toast id, so each toast starts its own timer.
    const timer = setTimeout(hideToast, TOAST_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      testID="toast"
      entering={FadeInUp.duration(250)}
      exiting={FadeOutUp.duration(200)}
      pointerEvents="none"
      style={{
        position: "absolute",
        top: insets.top + 8,
        left: 16,
        right: 16,
        alignItems: "center",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          maxWidth: 400,
          paddingVertical: 12,
          paddingLeft: 14,
          paddingRight: 20,
          borderRadius: 16,
          backgroundColor: colors.cardBackground,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        }}
      >
        <CheckCircle width={22} height={22} color={colors.tint} />
        <View style={{ flexShrink: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
            {toast.title}
          </Text>
          {toast.message && (
            <Text
              style={{
                marginTop: 2,
                fontSize: 13,
                color: colors.textSecondary,
              }}
            >
              {toast.message}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

/**
 * Renders toasts from `showToast`. Mount once at the root. On iOS the
 * overlay window keeps toasts above native modals.
 */
export const ToastHost = () => {
  const toast = useToast();

  const card = toast && <ToastCard key={toast.id} toast={toast} />;
  return Platform.OS === "ios" ? (
    <FullWindowOverlay>{card}</FullWindowOverlay>
  ) : (
    card
  );
};
