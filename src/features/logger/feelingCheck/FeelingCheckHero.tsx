import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/useColors";

const WORD_DELAY_MS = 110;

/** Title that writes itself in, one word at a time. No icon. */
export const FeelingCheckHero = ({
  title,
}: {
  rating: LogItem["rating"];
  title: string;
}) => {
  const colors = useColors();

  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={title}
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: 8,
      }}
    >
      {title.split(" ").map((word, index) => (
        <Animated.Text
          // Words can repeat; position keeps keys unique.
          key={`${index}-${word}`}
          entering={FadeInDown.delay(200 + index * WORD_DELAY_MS)
            .duration(500)
            .springify()
            .damping(18)}
          style={{
            fontSize: 30,
            lineHeight: 38,
            fontWeight: "600",
            color: colors.text,
          }}
        >
          {word}
        </Animated.Text>
      ))}
    </View>
  );
};
