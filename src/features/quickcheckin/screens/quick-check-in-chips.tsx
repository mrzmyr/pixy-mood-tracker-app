import Check from "lucide-react-native/icons/check";
import { Pressable, Text, useColorScheme } from "react-native";
import { RADIUS } from "@/constants/radius";
import { EmotionIndicator } from "@/features/logger";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import useScale from "@/hooks/use-scale";
import { getRatingLabel } from "@/lib/rating-label";
import { useSetting } from "@/state/settings";
import type { Emotion } from "@/types";

/** One rating as a square pixel. Seven fill a row. */
export const MoodPixel = ({
  rating,
  selected,
  onPress,
}: {
  rating: LogItem["rating"];
  selected: boolean;
  onPress: () => void;
}) => {
  const haptics = useHaptics();
  const scale = useScale(useSetting("scaleType"));
  const colorScheme = useColorScheme();

  return (
    <Pressable
      testID={`quick-check-in-mood-${rating}`}
      accessibilityRole="radio"
      accessibilityLabel={getRatingLabel(rating)}
      accessibilityState={{ selected }}
      onPress={async () => {
        await haptics.selection();
        onPress();
      }}
      style={({ pressed }) => ({
        flex: 1,
        aspectRatio: 1,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: RADIUS.sm,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor:
          colorScheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.2)",
        backgroundColor: scale.colors[rating].background,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Check
        color={selected ? scale.colors[rating].text : "transparent"}
        width={20}
        height={20}
      />
    </Pressable>
  );
};

/** Emotion as a chip, same shape as tag chips. */
export const EmotionChip = ({
  emotion,
  selected,
  onPress,
}: {
  emotion: Emotion;
  selected: boolean;
  onPress: () => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const colorScheme = useColorScheme();

  const idleBorder =
    colorScheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={emotion.label}
      accessibilityState={{ checked: selected }}
      onPress={async () => {
        await haptics.selection();
        onPress();
      }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: selected ? colors.tint : idleBorder,
        backgroundColor: selected
          ? colors.tagBackgroundActive
          : colors.tagBackground,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        marginBottom: 8,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <EmotionIndicator emotion={emotion} />
      <Text
        style={{
          color: selected ? colors.tagTextActive : colors.tagText,
          fontSize: 17,
        }}
      >
        {emotion.label}
      </Text>
    </Pressable>
  );
};
