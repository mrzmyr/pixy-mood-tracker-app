import FlagHighlight from "@/components/FlagHighlight";
import dayjs from "dayjs";
import { ScrollView, Text, View } from "react-native";
import useColors from "@/hooks/useColors";
import { useLogState } from "@/features/logs";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/featureFlags";
import { OPTIONS } from "../catalog";
import { useCompletedToday } from "../InterventionHistoryProvider";
import { matchToday } from "../match";
import { useCardShown } from "../useCardShown";
import { useOpenIntervention } from "../useOpenIntervention";
import { OptionTile } from "./OptionTile";

const TILE_WIDTH = 156;
/** Horizontal padding of the calendar list; the strip bleeds through it. */
const LIST_PADDING = 16;

/**
 * "For You Today" in the calendar footer: all lengths for today's latest
 * matching entry. Completed tiles show a check and stay usable. Gone at
 * midnight; there is no dismiss control.
 */
export const ForYouToday = () => {
  const isEnabled = useFeatureFlag("interventions");
  const colors = useColors();
  const logState = useLogState();
  const completedToday = useCompletedToday();
  const open = useOpenIntervention();
  const done = new Set(completedToday);
  const match = isEnabled ? matchToday(logState.items) : null;
  const options = match ? OPTIONS[match.cluster].calendar : [];

  useCardShown(
    match
      ? {
          surface: "calendar",
          cluster: match.cluster,
          matched_emotions: match.emotions,
          options_shown: options,
          completed_today_count: completedToday.length,
        }
      : null
  );

  if (!match) {
    return null;
  }

  return (
    <FlagHighlight flag="interventions">
      <View
        testID="for-you-today"
        style={{ marginTop: 24, gap: 10, marginHorizontal: -LIST_PADDING }}
      >
        <View style={{ paddingHorizontal: LIST_PADDING, gap: 2 }}>
          <Text
            accessibilityRole="header"
            style={{ fontSize: 15, fontWeight: "600", color: colors.text }}
          >
            {t("interventions_for_you_today")}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            {t(`interventions_because_${match.cluster}`, {
              time: dayjs(match.item.dateTime).format("LT"),
            })}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: LIST_PADDING,
            paddingVertical: 8,
            gap: 10,
          }}
        >
          {options.map((id, position) => (
            <OptionTile
              key={id}
              id={id}
              isDone={done.has(id)}
              backgroundColor={colors.cardBackground}
              style={{ width: TILE_WIDTH }}
              onPress={() =>
                open({
                  id,
                  surface: "calendar",
                  position,
                  completedToday,
                  navigation: "push",
                })
              }
            />
          ))}
        </ScrollView>
      </View>
    </FlagHighlight>
  );
};
