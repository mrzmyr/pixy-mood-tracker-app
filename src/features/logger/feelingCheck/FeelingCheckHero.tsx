import { Check } from "lucide-react-native";
import { View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/useColors";

/** Visual above the saved message. */
export const FeelingCheckHero = (_props: { rating: LogItem["rating"] }) => {
  const colors = useColors();

  return (
    <Animated.View entering={ZoomIn.springify().damping(14)}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.logCardBackground,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Check color={colors.text} size={26} strokeWidth={2} />
      </View>
    </Animated.View>
  );
};
