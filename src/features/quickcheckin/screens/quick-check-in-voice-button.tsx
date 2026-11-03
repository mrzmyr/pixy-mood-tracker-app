import Mic from "lucide-react-native/icons/mic";
import { Pressable } from "react-native";
import { RADIUS } from "@/constants/radius";
import { isVoiceModeSupported } from "@/features/voice";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/feature-flags";

/**
 * Square mic button next to the search field. Opens voice mode. Shows only
 * with flag `voice-mode` on a platform that supports it.
 */
export const QuickCheckInVoiceButton = ({
  onPress,
}: {
  onPress: () => void;
}) => {
  const colors = useColors();
  const hasVoice = useFeatureFlag("voice-mode") && isVoiceModeSupported;

  if (!hasVoice) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("voice_mode_open")}
      testID="quick-check-in-voice"
      onPress={onPress}
      style={({ pressed }) => ({
        aspectRatio: 1,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: RADIUS.sm,
        borderCurve: "continuous",
        backgroundColor: colors.tertiaryButtonBackground,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Mic width={20} height={20} color={colors.tertiaryButtonText} />
    </Pressable>
  );
};
