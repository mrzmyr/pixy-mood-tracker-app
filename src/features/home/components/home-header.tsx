import dayjs from "dayjs";
import { useState } from "react";
import { View } from "react-native";
import { TextMorph } from "@/components/text-morph";
import useColors from "@/hooks/use-colors";
import { HOME_TEXT, HOME_WEIGHT } from "../layout";

/**
 * Top of Home: weekday and date of the selected day. The profile button
 * sits in the native bar above. Changed letters and digits morph when the
 * day changes: down for an earlier day, up for a later one.
 */
export const HomeHeader = ({
  date,
}: {
  /** `DATE_FORMAT` date. */
  date: string;
}) => {
  const colors = useColors();
  const day = dayjs(date);
  const [shown, setShown] = useState({ date, isEarlier: false });
  if (shown.date !== date) {
    setShown({ date, isEarlier: date < shown.date });
  }

  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={day.format("dddd, LL")}
    >
      <TextMorph
        countsDown={shown.isEarlier}
        style={{
          ...HOME_TEXT.header,
          color: colors.textSecondary,
          fontWeight: HOME_WEIGHT,
        }}
      >
        {day.format("dddd")}
      </TextMorph>
      <TextMorph
        countsDown={shown.isEarlier}
        style={{
          ...HOME_TEXT.header,
          color: colors.homeTextMuted,
          fontWeight: HOME_WEIGHT,
        }}
      >
        {day.format("MMMM DD")}
      </TextMorph>
    </View>
  );
};
