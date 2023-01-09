import useScale from "@/hooks/useScale";
import { Emotion } from "@/types";
import { View } from "react-native";

export const EmotionIndicator = ({
  category,
}: {
  category: Emotion['category']
}) => {
  const scale = useScale();
  const colorMapping = {
    very_good: scale.colors.very_good,
    good: scale.colors.very_good,
    neutral: scale.colors.neutral,
    bad: scale.colors.very_bad,
    very_bad: scale.colors.very_bad,
  };

  const color = colorMapping[category];

  return (
    <View
      style={{
        width: 8,
        height: 8,
        backgroundColor: color.background,
        borderRadius: 100,
        marginRight: 10,
        paddingRight: 8,
      }}
    />
  );
}