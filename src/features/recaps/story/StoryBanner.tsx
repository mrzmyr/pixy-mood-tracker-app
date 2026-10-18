import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { RADIUS } from "@/constants/Radius";
import { t } from "@/lib/translation";
import type { StorySource } from "@/state/analytics/events";
import type { Period, RecapDay } from "../types";
import { monthName } from "./format";
import { useDayColors } from "./parts";
import { STORY_MAX_FONT_SCALE } from "./theme";

/** Gradient stops: the month's day colors in order, at most 4. */
const sample = (colors: string[], count = 4) => {
  if (colors.length <= count) {
    return colors;
  }
  return Array.from(
    { length: count },
    (_, index) =>
      colors[Math.round((index * (colors.length - 1)) / (count - 1))] ??
      colors[0]
  );
};

/**
 * "New / September Recap / Watch" on the month's own mood gradient. Opens
 * the month story full screen.
 */
export const StoryBanner = ({
  period,
  days,
  source,
}: {
  period: Period;
  days: RecapDay[];
  source: StorySource;
}) => {
  const router = useRouter();
  const dayColors = useDayColors(days);
  const stops = sample([...dayColors.values()]);
  const [first = "#34D399", second = first] = stops;
  const gradient: [string, string, ...string[]] = [
    first,
    second,
    ...stops.slice(2),
  ];
  const title = t("recaps_story_banner_title", {
    month: monthName(period.start),
  });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${t("recaps_story_watch")}`}
      onPress={() =>
        router.push({
          pathname: "/recaps/story/[date]",
          params: { date: period.start, source },
        })
      }
      testID="recap-story-banner"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: RADIUS.lg,
          padding: 18,
          minHeight: 132,
          justifyContent: "space-between",
        }}
      >
        <View style={{ gap: 2 }}>
          <Text
            maxFontSizeMultiplier={STORY_MAX_FONT_SCALE}
            style={{
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 1,
              textTransform: "uppercase",
              color: "rgba(10,10,10,0.7)",
            }}
          >
            {t("recaps_story_new")}
          </Text>
          <Text
            maxFontSizeMultiplier={STORY_MAX_FONT_SCALE}
            style={{
              fontSize: 26,
              lineHeight: 30,
              fontWeight: "800",
              letterSpacing: -0.5,
              color: "#0A0A0A",
            }}
          >
            {title}
          </Text>
        </View>
        <View
          style={{
            alignSelf: "flex-start",
            marginTop: 12,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: RADIUS.full,
            backgroundColor: "#0A0A0A",
          }}
        >
          <Text
            maxFontSizeMultiplier={STORY_MAX_FONT_SCALE}
            style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}
          >
            {t("recaps_story_watch")}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
};
