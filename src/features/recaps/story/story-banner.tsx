import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import Play from "lucide-react-native/icons/play";
import { Headline, Secondary } from "@/components/type";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { useSettings } from "@/state/settings";
import type { StorySource } from "@/state/analytics/events";
import { addDays, daysBetween } from "../days";
import type { Period, RecapDay } from "../types";
import { monthName } from "./format";
import { useDayColors } from "./parts";

/**
 * "September Recap / Ready to watch" on the recap card look. Story progress
 * bars on top, one per day in its mood color. Opens the month story full
 * screen. Week recaps open the week story the same way.
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
  const colors = useColors();
  const { settings } = useSettings();
  const dayColors = useDayColors(days);
  const empty = colors.scales[settings.scaleType].empty.background;
  const dates = Array.from(
    { length: daysBetween(period.start, period.end) + 1 },
    (_, index) => addDays(period.start, index)
  );
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
        padding: 16,
        gap: 16,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: colors.recapCardBorder,
        backgroundColor: colors.cardBackground,
        boxShadow: colors.recapCardShadow,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flexDirection: "row", gap: 2, height: 4 }}>
        {dates.map((date) => (
          <View
            key={date}
            style={{
              flex: 1,
              borderRadius: 2,
              backgroundColor: dayColors.get(date) ?? empty,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Headline>{title}</Headline>
          <Secondary>{t("recaps_story_ready")}</Secondary>
        </View>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: RADIUS.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.text,
          }}
        >
          <Play
            width={14}
            height={14}
            color={colors.cardBackground}
            fill={colors.cardBackground}
            style={{ marginLeft: 2 }}
          />
        </View>
      </View>
    </Pressable>
  );
};
