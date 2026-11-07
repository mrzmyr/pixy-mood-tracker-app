import { EmotionIndicator } from "@/features/logger";
import useColors from "@/hooks/use-colors";
import { tDynamic } from "@/lib/translation";
import type { Emotion } from "@/types";
import { Text, View } from "react-native";
import { CHIP, COMPACT_CHIP } from "@/constants/chip";
import { Chip } from "@/components/chip";

/** Emotion chip with its category marker, used in entries and statistics. */
export const EmotionItem = ({
  emotion,
  compact = false,
}: {
  emotion: Pick<Emotion, "key" | "category">;
  /** Small chip for dense rows, like timeline cards. */
  compact?: boolean;
}) => {
  const colors = useColors();

  if (!compact) {
    return (
      <Chip
        label={tDynamic(`log_emotion_${emotion.key}`)}
        lead={<EmotionIndicator emotion={emotion} size={CHIP.lead} />}
      />
    );
  }

  return (
    <View>
      <View
        style={{
          height: COMPACT_CHIP.height,
          paddingHorizontal: COMPACT_CHIP.paddingHorizontal,
          borderRadius: COMPACT_CHIP.borderRadius,
          // Same surface as compact tag and person chips.
          backgroundColor: colors.entryBackground,
          borderColor: colors.entryItemBorder,
          borderWidth: 1,
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <EmotionIndicator emotion={emotion} compact />
        <Text
          style={{
            color: colors.text,
            fontSize: COMPACT_CHIP.fontSize,
          }}
        >
          {tDynamic(`log_emotion_${emotion.key}`)}
        </Text>
      </View>
    </View>
  );
};
