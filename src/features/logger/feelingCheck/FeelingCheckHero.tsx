import { View } from "react-native";
import Animated, { Keyframe } from "react-native-reanimated";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/useColors";
import useScale from "@/hooks/useScale";
import { useSettings } from "@/state/settings";

const SIZE = 64;
const DAYS_BEFORE = 3;

// Today's pixel drops into the row, overshoots, and settles.
const drop = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ translateY: -90 }, { rotate: "-14deg" }, { scale: 0.7 }],
  },
  55: {
    opacity: 1,
    transform: [{ translateY: 6 }, { rotate: "4deg" }, { scale: 1.06 }],
  },
  80: {
    transform: [{ translateY: -3 }, { rotate: "-1deg" }, { scale: 0.98 }],
  },
  100: {
    opacity: 1,
    transform: [{ translateY: 0 }, { rotate: "0deg" }, { scale: 1 }],
  },
})
  .delay(150)
  .duration(900);

// Soft outline that ripples out once the pixel lands.
const ripple = new Keyframe({
  0: { opacity: 0.5, transform: [{ scale: 1 }] },
  100: { opacity: 0, transform: [{ scale: 1.7 }] },
})
  .delay(650)
  .duration(900);

/** Today's pixel dropping into a row of empty days, like the calendar. */
export const FeelingCheckHero = ({ rating }: { rating: LogItem["rating"] }) => {
  const colors = useColors();
  const { settings } = useSettings();
  const scale = useScale(settings.scaleType);
  const mood = scale.colors[rating].background;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {Array.from({ length: DAYS_BEFORE }, (_, index) => (
        <View
          key={index}
          style={{
            width: SIZE * 0.6,
            height: SIZE * 0.6,
            borderRadius: 10,
            backgroundColor: colors.logCardBackground,
            opacity: 0.4 + index * 0.2,
          }}
        />
      ))}
      <View
        style={{
          width: SIZE,
          height: SIZE,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.View
          entering={ripple}
          style={{
            position: "absolute",
            width: SIZE,
            height: SIZE,
            borderRadius: 18,
            borderWidth: 2,
            borderColor: mood,
            opacity: 0,
          }}
        />
        <Animated.View
          entering={drop}
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: 18,
            backgroundColor: mood,
          }}
        />
      </View>
    </View>
  );
};
