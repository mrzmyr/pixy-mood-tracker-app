import { Pressable, StyleSheet, View } from "react-native";
import { GlassView } from "expo-glass-effect";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Mic from "lucide-react-native/icons/mic";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { SHADOW } from "@/constants/shadow";
import { HAS_GLASS, IS_ANDROID, RADIUS, SIZE } from "./float-button-metrics";

// Space between the voice button and the add button.
const GAP = 12;

/**
 * Tertiary round button left of the calendar add button. Opens voice mode.
 * Same size and surface as the add button, so the pair reads as one group.
 */
export const CalendarVoiceButton = ({ onPress }: { onPress: () => void }) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      testID="calendar-voice-entry"
      accessibilityRole="button"
      accessibilityLabel={t("voice_mode_open")}
      onPress={onPress}
      android_ripple={{ color: "rgba(0, 0, 0, 0.12)", foreground: true }}
      style={({ pressed }) => ({
        position: "absolute",
        bottom: 20 + insets.bottom,
        right: 20 + SIZE + GAP,
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
        <Mic width={22} height={22} color={colors.tertiaryButtonText} />
      </View>
    </Pressable>
  );
};
