import { EmotionIndicator } from "@/features/logger";
import useColors from "@/hooks/useColors";
import { tDynamic } from "@/lib/translation";
import type { Emotion } from "@/types";
import { Text, View } from "react-native";
import { RADIUS } from "@/constants/Radius";
import { COMPACT_CHIP } from "@/constants/Chip";

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

  return (
    <View>
      <View
        style={{
          ...(compact
            ? {
                height: COMPACT_CHIP.height,
                paddingHorizontal: COMPACT_CHIP.paddingHorizontal,
                borderRadius: COMPACT_CHIP.borderRadius,
                // Same surface as compact tag and person chips.
                backgroundColor: colors.entryBackground,
                borderColor: colors.entryItemBorder,
              }
            : {
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: RADIUS.sm,
                backgroundColor: colors.logCardBackground,
                borderColor: colors.logCardBorder,
              }),
          borderWidth: 1,
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <EmotionIndicator emotion={emotion} compact={compact} />
        <Text
          style={{
            color: colors.text,
            fontSize: compact ? COMPACT_CHIP.fontSize : 17,
          }}
        >
          {tDynamic(`log_emotion_${emotion.key}`)}
        </Text>
      </View>
    </View>
  );
};
