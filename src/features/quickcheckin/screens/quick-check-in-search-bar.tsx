import Mic from "lucide-react-native/icons/mic";
import { Pressable, View } from "react-native";
import { SearchInput } from "@/components/search-input";
import { RADIUS } from "@/constants/radius";
import { isVoiceModeSupported } from "@/features/voice";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/feature-flags";

/**
 * Search field, plus a mic button that opens voice mode. The mic shows only
 * with flag `voice-mode` on a platform that supports it.
 */
export const QuickCheckInSearchBar = ({
  query,
  onChange,
  onVoice,
}: {
  query: string;
  onChange: (text: string) => void;
  onVoice: () => void;
}) => {
  const colors = useColors();
  const hasVoice = useFeatureFlag("voice-mode") && isVoiceModeSupported;

  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <View style={{ flex: 1 }}>
        <SearchInput
          testID="quick-check-in-search"
          value={query}
          onChange={onChange}
        />
      </View>
      {hasVoice && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("voice_mode_open")}
          testID="quick-check-in-voice"
          onPress={onVoice}
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
      )}
    </View>
  );
};
