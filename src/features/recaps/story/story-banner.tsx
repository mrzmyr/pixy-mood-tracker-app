import { useRouter } from "expo-router";
import { Pressable, useColorScheme, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import Play from "lucide-react-native/icons/play";
import { Sky, SKY_DRIFT_SPEED } from "@/components/sky";
import { Headline, Secondary } from "@/components/type";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import type { StorySource } from "@/state/analytics/events";
import type { Period } from "../types";
import { monthName } from "./format";

/** Cloud photo height in the card: a little zoomed in, clouds keep their shape. */
const CARD_SKY_HEIGHT = 320;
/** The card shows this band of the photo, from its bottom: the cloud tops. */
const CARD_SKY_OFFSET = 70;

/**
 * "September Recap / Ready to watch" on a drifting sky, with the recap card
 * border and shadow. Opens the month story full screen. Week recaps open
 * the week story the same way.
 */
export const StoryBanner = ({
  period,
  source,
}: {
  period: Period;
  source: StorySource;
}) => {
  const router = useRouter();
  const colors = useColors();
  const isDark = useColorScheme() === "dark";
  const speed = useSharedValue(SKY_DRIFT_SPEED);
  // Gray reads washed out on blue: by day a deep blue of the sky's hue.
  const quiet = isDark ? "rgba(255,255,255,0.7)" : "#2A4A6B";
  const title =
    period.kind === "week"
      ? t("recaps_story_banner_title_week")
      : t("recaps_story_banner_title", { month: monthName(period.start) });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${t("recaps_story_ready")}`}
      onPress={() =>
        router.push({
          pathname: "/recaps/story/[date]",
          params: {
            date: period.start,
            source,
            ...(period.kind === "week" && { kind: "week" }),
          },
        })
      }
      testID="recap-story-banner"
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 16,
        borderRadius: RADIUS.md,
        borderCurve: "continuous",
        borderWidth: 1,
        // Outer line a little darker, inner line white: the edge reads on
        // light clouds and on blue sky alike.
        borderColor: isDark ? colors.recapCardBorder : "rgba(10,40,80,0.16)",
        boxShadow: colors.recapCardShadow,
        overflow: "hidden",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {/* Anchored to the bottom: the card shows the cloud band, not the
          plain blue above it. */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: -CARD_SKY_OFFSET,
          height: CARD_SKY_HEIGHT,
        }}
      >
        <Sky speed={speed} height={CARD_SKY_HEIGHT} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: RADIUS.md - 1,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(255,255,255,0.75)",
        }}
      />
      <View style={{ flex: 1 }}>
        <Headline style={{ color: isDark ? "#FFFFFF" : "#0A0A0A" }}>
          {title}
        </Headline>
        <Secondary style={{ color: quiet }}>
          {t("recaps_story_ready")}
        </Secondary>
      </View>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: RADIUS.full,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDark ? "#FFFFFF" : "#0A0A0A",
        }}
      >
        <Play
          width={14}
          height={14}
          color={isDark ? "#0A0A0A" : "#FFFFFF"}
          fill={isDark ? "#0A0A0A" : "#FFFFFF"}
          style={{ marginLeft: 2 }}
        />
      </View>
    </Pressable>
  );
};
