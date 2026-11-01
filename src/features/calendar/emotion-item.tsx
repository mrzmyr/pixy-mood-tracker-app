import { EmotionIndicator } from "@/features/logger";
import useColors from "@/hooks/use-colors";
import { tDynamic } from "@/lib/translation";
import type { Emotion } from "@/types";
import { View } from "react-native";
import { Label } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import { COMPACT_CHIP } from "@/constants/chip";

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
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: RADIUS.sm,
                borderCurve: "continuous",
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
        <Label size={compact ? 14 : 16} style={{ color: colors.text }}>
          {tDynamic(`log_emotion_${emotion.key}`)}
        </Label>
      </View>
    </View>
  );
};
