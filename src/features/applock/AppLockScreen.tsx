import { Lock } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import { Platform, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";
import Button from "@/components/Button";
import { SUPPORT_EMAIL } from "@/constants/Config";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useAppLock } from "./AppLockProvider";

/** Brand square of the launch splash, so lock and launch look alike. */
const SQUARE = "#fdba74";
const SQUARE_SIZE = 64;
const MONO_FONT = Platform.select({ ios: "Menlo", default: "monospace" });

/**
 * Hides the app while it is locked or not in front. Mount once at the root,
 * after every other overlay. On iOS the overlay window keeps it above native
 * modals, like the toast host. With analytics consent, the footer shows the
 * PostHog id as support code, so support can target the `app-lock-bypass`
 * flag at this person.
 */
export const AppLockScreen = () => {
  const { isLocked, isCovered, hasFailed, unlock } = useAppLock();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const analytics = useAnalytics();
  const posthog = usePostHog();
  // Flags load only with consent, so the code helps only then.
  const supportCode = analytics.isEnabled ? posthog?.getDistinctId() : null;

  if (!isLocked && !isCovered) {
    return null;
  }

  const screen = (
    <GestureHandlerRootView
      testID="app-lock-screen"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingHorizontal: 32,
        },
      ]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          borderRadius: RADIUS.lg,
          backgroundColor: SQUARE,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Lock size={28} color="#ffffff" strokeWidth={2.25} />
      </View>
      {isLocked && (
        <>
          <Text
            accessibilityRole="header"
            style={{
              marginTop: 24,
              fontSize: 22,
              fontWeight: "600",
              color: colors.text,
              textAlign: "center",
            }}
          >
            {t("app_lock_locked")}
          </Text>
          <Button
            testID="app-lock-unlock"
            onPress={unlock}
            style={{ marginTop: 32, minWidth: 200 }}
          >
            {t("app_lock_unlock")}
          </Button>
          {hasFailed && (
            <Text
              accessibilityLiveRegion="polite"
              style={{
                marginTop: 16,
                fontSize: 15,
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              {t("app_lock_failed")}
            </Text>
          )}
          {supportCode ? (
            <View
              style={{
                position: "absolute",
                bottom: insets.bottom + 24,
                left: 32,
                right: 32,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textSecondary,
                  textAlign: "center",
                }}
              >
                {t("app_lock_support", { email: SUPPORT_EMAIL })}
              </Text>
              <Text
                selectable
                testID="app-lock-support-code"
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  fontFamily: MONO_FONT,
                  color: colors.textSecondary,
                  textAlign: "center",
                }}
              >
                {supportCode}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </GestureHandlerRootView>
  );

  return Platform.OS === "ios" ? (
    <FullWindowOverlay unstable_accessibilityContainerViewIsModal>
      {screen}
    </FullWindowOverlay>
  ) : (
    screen
  );
};
