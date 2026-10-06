import { EmotionIndicator } from "@/features/logger";
import useColors from "@/hooks/useColors";
import { tDynamic } from "@/lib/translation";
import type { Emotion } from "@/types";
import { Text, View } from "react-native";
import { RADIUS } from "@/constants/Radius";

/** Emotion chip with its category marker, used in entries and statistics. */
export const EmotionItem = ({
  emotion,
}: {
  emotion: Pick<Emotion, "key" | "category">;
}) => {
  const colors = useColors();

  return (
    <View>
      <View
        style={{
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: RADIUS.sm,
          backgroundColor: colors.logCardBackground,
          borderWidth: 1,
          borderColor: colors.logCardBorder,
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <EmotionIndicator emotion={emotion} />
        <Text
          style={{
            color: colors.text,
            fontSize: 17,
          }}
        >
          {tDynamic(`log_emotion_${emotion.key}`)}
        </Text>
      </View>
    </View>
  );
};
