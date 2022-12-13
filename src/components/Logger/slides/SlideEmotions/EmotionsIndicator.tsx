import useScale from "@/hooks/useScale";
import { Emotion } from "@/types";
import { useColorScheme, View } from "react-native";

export const EmotionIndicator = ({
  category,
}: {
  category: Emotion['category']
}) => {
  const colorScheme = useColorScheme();

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
        height: 10,
        backgroundColor: color.background,
        borderColor: colorScheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
        borderWidth: 1,
        borderRadius: 100,
        marginRight: 10,
        paddingRight: 8,
      }}
    />
  );
}