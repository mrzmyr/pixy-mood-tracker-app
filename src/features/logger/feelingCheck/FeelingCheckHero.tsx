import dayjs from "dayjs";
import { Text, View } from "react-native";
import Animated, { Keyframe } from "react-native-reanimated";
import type { LogItem } from "@/features/logs";
import { useLogState } from "@/features/logs";
import useColors from "@/hooks/useColors";
import { getItemDate } from "@/lib/logDates";
import { useSettings } from "@/state/settings";
import { getWeekPixels } from "./weekPixels";

const PIXEL = 34;
const TODAY_PIXEL = 52;
const GAP = 8;

// The entry's pixel drops into the row, overshoots, and settles.
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
  100: { opacity: 0, transform: [{ scale: 1.6 }] },
})
  .delay(650)
  .duration(900);

/**
 * The saved entry's pixel dropping into its week, next to the 6 days
 * before. Every pixel has the calendar color of its day.
 */
export const FeelingCheckHero = ({ item }: { item: LogItem }) => {
  const colors = useColors();
  const { settings } = useSettings();
  const logState = useLogState();
  const scale = colors.scales[settings.scaleType];
  const pixels = getWeekPixels({
    items: logState.items,
    date: getItemDate(item),
  });
  const lastIndex = pixels.length - 1;

  return (
    <View
      testID="feeling-check-week"
      style={{ flexDirection: "row", alignItems: "flex-end", gap: GAP }}
    >
      {pixels.map((pixel, index) => {
        const isEntryDay = index === lastIndex;
        const size = isEntryDay ? TODAY_PIXEL : PIXEL;
        const radius = isEntryDay ? 15 : 10;
        const background =
          pixel.rating === null
            ? scale.empty.background
            : scale[pixel.rating].background;

        return (
          <View key={pixel.date} style={{ alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: size,
                height: size,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isEntryDay && (
                <Animated.View
                  entering={ripple}
                  style={{
                    position: "absolute",
                    width: size,
                    height: size,
                    borderRadius: radius,
                    borderWidth: 2,
                    borderColor: background,
                    opacity: 0,
                  }}
                />
              )}
              <Animated.View
                testID={`feeling-check-pixel-${pixel.date}`}
                entering={isEntryDay ? drop : undefined}
                style={{
                  width: size,
                  height: size,
                  borderRadius: radius,
                  backgroundColor: background,
                  // Days without entries look like empty calendar days.
                  borderWidth: pixel.rating === null ? 2 : 0,
                  borderStyle: "dotted",
                  borderColor: scale.empty.border,
                }}
              />
            </View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: isEntryDay ? "600" : "400",
                color: isEntryDay ? colors.text : colors.textSecondary,
              }}
            >
              {dayjs(pixel.date).format("dd")}
            </Text>
          </View>
        );
      })}
    </View>
  );
};
