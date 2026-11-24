import { View } from "react-native";
import { Copy, Label } from "@/components/typography";
import type { IScale } from "@/constants/colors/scales";
import { SPACE } from "@/constants/space";
import { SleepQualityMeter } from "@/features/logger";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { HOME_LAYOUT, HOME_TEXT, HOME_WEIGHT } from "../layout";
import { EntryPreview } from "./entry-preview";
import type { EntryPreviewData } from "./entry-preview";

/**
 * Sleep quality of the day as the first row: the app's sleep meter in the
 * icon column and "Sleep" in gray, like a calendar anchor row. The meter
 * shows the amount; no rating word, as everywhere else.
 */
const SleepRow = ({ quality }: { quality: number }) => {
  const colors = useColors();
  return (
    <View
      testID="home-sleep"
      accessible
      accessibilityLabel={`${t("logger_step_sleep")} ${quality + 1}/5`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: HOME_LAYOUT.iconGap,
        minHeight: HOME_LAYOUT.rowMinHeight,
        paddingLeft: HOME_LAYOUT.iconInset,
      }}
    >
      <View
        style={{
          width: HOME_LAYOUT.iconSize,
          alignItems: "center",
        }}
      >
        <SleepQualityMeter value={quality} height={HOME_LAYOUT.iconSize} />
      </View>
      <Label
        size={20}
        style={{
          ...HOME_TEXT.title,
          color: colors.homeTextMuted,
          fontWeight: HOME_WEIGHT,
        }}
      >
        {t("logger_step_sleep")}
      </Label>
    </View>
  );
};

/**
 * Rows of the selected day: sleep quality when rated, then entries oldest
 * first, split by dotted lines. A day without entries shows a short hint;
 * the add button creates one.
 */
export const DayEntries = ({
  entries,
  sleepQuality = null,
  scale,
  onPressEntry,
}: {
  entries: EntryPreviewData[];
  /** Average sleep quality of the day, 0 to 4, or `null` when unrated. */
  sleepQuality?: number | null;
  scale: IScale;
  onPressEntry: (entry: EntryPreviewData) => void;
}) => {
  const colors = useColors();

  if (entries.length === 0) {
    return (
      <View testID="home-day-empty" style={{ paddingVertical: SPACE.xxxl }}>
        <Copy
          size={16}
          style={{ color: colors.homeTextMuted, textAlign: "center" }}
        >
          {t("calendar_timeline_empty")}
        </Copy>
      </View>
    );
  }

  return (
    <View testID="home-day-entries">
      {sleepQuality !== null && <SleepRow quality={sleepQuality} />}
      {entries.map((entry, index) => (
        <EntryPreview
          key={entry.id}
          entry={entry}
          scale={scale}
          hasDivider={index > 0 || sleepQuality !== null}
          onPress={onPressEntry}
        />
      ))}
    </View>
  );
};
