import dayjs from "dayjs";
import { View } from "react-native";
import { Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { HOME_TEXT, HOME_WEIGHT } from "../layout";

/**
 * Top of Home: weekday and date of the selected day. The profile button
 * sits in the native bar above.
 */
export const HomeHeader = ({
  date,
}: {
  /** `DATE_FORMAT` date. */
  date: string;
}) => {
  const colors = useColors();
  const day = dayjs(date);

  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={day.format("dddd, LL")}
    >
      <Label
        size={20}
        style={{
          ...HOME_TEXT.header,
          color: colors.textSecondary,
          fontWeight: HOME_WEIGHT,
        }}
      >
        {day.format("dddd")}
      </Label>
      <Label
        size={20}
        style={{
          ...HOME_TEXT.header,
          color: colors.homeTextMuted,
          fontWeight: HOME_WEIGHT,
        }}
      >
        {day.format("MMMM DD")}
      </Label>
    </View>
  );
};
