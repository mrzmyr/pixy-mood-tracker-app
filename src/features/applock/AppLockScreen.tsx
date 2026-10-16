import * as Clipboard from "expo-clipboard";
import { Lock } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";
import Button from "@/components/Button";
import { ToastHost } from "@/components/Toast";
import { SUPPORT_EMAIL } from "@/constants/Config";
import useColors from "@/hooks/useColors";
import { showToast } from "@/lib/toast";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useAppLock } from "./AppLockProvider";

const MONO_FONT = Platform.select({ ios: "Menlo", default: "monospace" });

/**
 * Gray Help link. Opens the support message with the support code; a tap on
 * the code copies it.
 */
const LockHelp = ({ code }: { code: string }) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);

  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    showToast({ title: t("app_lock_code_copied") });
  };

  return (
    <View
      style={{
        position: "absolute",
        bottom: insets.bottom + 24,
        left: 32,
        right: 32,
        alignItems: "center",
      }}
    >
      {isOpen ? (
        <>
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              textAlign: "center",
            }}
          >
            {t("app_lock_support", { email: SUPPORT_EMAIL })}
          </Text>
          <Pressable
            testID="app-lock-support-code"
            accessibilityRole="button"
            accessibilityHint={t("app_lock_code_copy_hint")}
            onPress={copyCode}
            hitSlop={12}
            style={({ pressed }) => ({
              marginTop: 4,
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: MONO_FONT,
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              {code}
            </Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          testID="app-lock-help"
          accessibilityRole="button"
          onPress={() => setIsOpen(true)}
          hitSlop={16}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Text style={{ fontSize: 15, color: colors.textSecondary }}>
            {t("app_lock_help_link")}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

/**
 * Hides the app while it is locked or not in front. Mount once at the root,
 * after every other overlay. On iOS the overlay window keeps it above native
 * modals, like the toast host. With analytics consent, a Help link shows
 * the PostHog id as support code, so support can target the
 * `app-lock-bypass` flag at this person.
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
      >
        <Lock size={40} color={colors.text} strokeWidth={2} />
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
          {supportCode ? <LockHelp code={supportCode} /> : null}
        </>
      )}
      {/* The lock covers the root toast host, so it brings its own. */}
      <ToastHost inline />
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
