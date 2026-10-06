import { Lock } from "lucide-react-native";
import { Platform, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";
import Button from "@/components/Button";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { useAppLock } from "./AppLockProvider";

/** Brand square of the launch splash, so lock and launch look alike. */
const SQUARE = "#fdba74";
const SQUARE_SIZE = 64;

/**
 * Hides the app while it is locked or not in front. Mount once at the root,
 * after every other overlay. On iOS the overlay window keeps it above native
 * modals, like the toast host.
 */
export const AppLockScreen = () => {
  const { isLocked, isCovered, hasFailed, unlock } = useAppLock();
  const colors = useColors();
  const insets = useSafeAreaInsets();

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
