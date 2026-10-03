import dayjs from "dayjs";
import { Text, View } from "react-native";
import { useMemo } from "react";
import Animated, {
  FadeIn,
  Keyframe,
  useReducedMotion,
} from "react-native-reanimated";
import useColors from "@/hooks/useColors";
import { useSettings } from "@/state/settings";
import { DROP_DELAY_MS, DROP_MS, getEaseOut, LAND_MS } from "./motion";
import type { WeekPixel } from "./weekPixels";

const PIXEL = 34;
const TODAY_PIXEL = 52;
const GAP = 8;

// The entry's pixel drops into its slot: no finger is involved, so no
// overshoot. Never from scale 0.
const createDrop = ({ isReducedMotion }: { isReducedMotion: boolean }) => {
  if (isReducedMotion) {
    return FadeIn.delay(DROP_DELAY_MS).duration(200);
  }

  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: -24 }, { scale: 0.92 }] },
    100: {
      opacity: 1,
      transform: [{ translateY: 0 }, { scale: 1 }],
      easing: getEaseOut(),
    },
  })
    .delay(DROP_DELAY_MS)
    .duration(DROP_MS);
};

// Soft outline that ripples out the moment the pixel lands.
const createRipple = () =>
  new Keyframe({
    0: { opacity: 0.45, transform: [{ scale: 1 }] },
    100: { opacity: 0, transform: [{ scale: 1.5 }], easing: getEaseOut() },
  })
    .delay(LAND_MS)
    .duration(450);

/**
 * The saved entry's pixel dropping into its week, next to the 6 days
 * before. Every pixel has the calendar color of its day.
 */
export const ConfirmationHero = ({ pixels }: { pixels: WeekPixel[] }) => {
  const colors = useColors();
  const { settings } = useSettings();
  const scale = colors.scales[settings.scaleType];
  const lastIndex = pixels.length - 1;
  const isReducedMotion = useReducedMotion();
  const drop = useMemo(
    () => createDrop({ isReducedMotion }),
    [isReducedMotion]
  );
  const ripple = useMemo(() => createRipple(), []);

  return (
    <View
      testID="confirmation-week"
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
              {isEntryDay && !isReducedMotion && (
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
                testID={`confirmation-pixel-${pixel.date}`}
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
