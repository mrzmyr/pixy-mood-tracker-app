import type { ComponentType } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { GlassView } from "expo-glass-effect";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Mic from "lucide-react-native/icons/mic";
import Zap from "lucide-react-native/icons/zap";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { isVoiceModeSupported } from "@/features/voice";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/feature-flags";
import { SHADOW } from "@/constants/shadow";
import { HAS_GLASS, IS_ANDROID, RADIUS, SIZE } from "./float-button-metrics";

// Space between neighbouring calendar float buttons.
const GAP = 12;

/**
 * Round button left of the calendar add button, for voice mode or quick
 * check-in. Same size and surface as the add button, so the row reads as one
 * group. `slot` 1 sits next to the add button, slot 2 one further left.
 */
const CalendarSecondaryButton = ({
  icon: Icon,
  label,
  testID,
  slot,
  onPress,
}: {
  icon: ComponentType<{ width: number; height: number; color: string }>;
  label: string;
  testID: string;
  slot: number;
  onPress: () => void;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      android_ripple={{ color: "rgba(0, 0, 0, 0.12)", foreground: true }}
      style={({ pressed }) => ({
        position: "absolute",
        bottom: 20 + insets.bottom,
        right: 20 + slot * (SIZE + GAP),
        zIndex: 100,
        width: SIZE,
        height: SIZE,
        borderRadius: RADIUS,
        opacity: !HAS_GLASS && !IS_ANDROID && pressed ? 0.7 : 1,
        ...(IS_ANDROID && {
          backgroundColor: colors.tertiaryButtonBackground,
          boxShadow: SHADOW.float,
          overflow: "hidden",
        }),
      })}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: RADIUS,
            justifyContent: "center",
            alignItems: "center",
          },
          !HAS_GLASS &&
            !IS_ANDROID && {
              backgroundColor: colors.tertiaryButtonBackground,
              boxShadow: SHADOW.float,
            },
        ]}
      >
        {HAS_GLASS && (
          <GlassView
            isInteractive
            style={[StyleSheet.absoluteFill, { borderRadius: RADIUS }]}
          />
        )}
        <Icon width={22} height={22} color={colors.tertiaryButtonText} />
      </View>
    </Pressable>
  );
};

/** Voice and quick check-in buttons, each behind its feature flag. */
export const CalendarSecondaryButtons = ({
  hasTodayEntry,
}: {
  hasTodayEntry: boolean;
}) => {
  const router = useRouter();
  const analytics = useAnalytics();
  const showVoice = useFeatureFlag("voice-mode") && isVoiceModeSupported;
  const showCheckIn = useFeatureFlag("quick-check-in");

  return (
    <>
      {showVoice && (
        <CalendarSecondaryButton
          icon={Mic}
          label={t("voice_mode_open")}
          testID="calendar-voice-entry"
          slot={1}
          onPress={() => {
            analytics.track("calendar:voice_tapped", {
              has_entries: hasTodayEntry,
            });
            router.push("/logs/voice");
          }}
        />
      )}
      {showCheckIn && (
        <CalendarSecondaryButton
          icon={Zap}
          label={t("quick_check_in_setting")}
          testID="calendar-quick-check-in"
          slot={showVoice ? 2 : 1}
          onPress={() => {
            analytics.track("calendar:check_in_tapped", {
              has_entries: hasTodayEntry,
            });
            router.push("/check-in/new");
          }}
        />
      )}
    </>
  );
};
