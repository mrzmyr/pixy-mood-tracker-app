import FlagHighlight from "@/components/flag-highlight";
import dayjs from "dayjs";
import { ScrollView, View } from "react-native";
import { Copy, Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { useToday } from "@/hooks/use-today";
import { useLogState } from "@/features/logs";
import { t } from "@/lib/translation";
import { useFeatureFlag } from "@/state/feature-flags";
import { OPTIONS } from "../catalog";
import { useCompletedToday } from "../completed";
import { matchToday } from "../match";
import { useCardShown } from "../use-card-shown";
import { useOpenIntervention } from "../use-open-intervention";
import { OptionTile } from "./option-tile";

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
  // Own subscription: a memoized parent does not re-render at midnight.
  const today = useToday();
  const completedToday = useCompletedToday();
  const open = useOpenIntervention();
  const done = new Set(completedToday);
  const match = isEnabled ? matchToday(logState.items, today) : null;
  const options = match ? OPTIONS[match.cluster].calendar : [];

  useCardShown(match?.cluster ?? null, {
    surface: "calendar",
    options_shown: options,
    completed_today_count: completedToday.length,
  });

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
          <Label
            size={14}
            strong
            accessibilityRole="header"
            style={{ color: colors.text }}
          >
            {t("interventions_for_you_today")}
          </Label>
          <Copy size={13} style={{ color: colors.textSecondary }}>
            {t(`interventions_because_${match.cluster}`, {
              time: dayjs(match.item.dateTime).format("LT"),
            })}
          </Copy>
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
