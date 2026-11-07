import dayjs from "dayjs";
import type { ReactNode } from "react";
import { View } from "react-native";
import { Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { HOME_TEXT, HOME_WEIGHT } from "../layout";

/**
 * Top of Home: weekday and date of the selected day on the left, `trailing`
 * (the profile button) on the right.
 */
export const HomeHeader = ({
  date,
  trailing,
}: {
  /** `DATE_FORMAT` date. */
  date: string;
  trailing?: ReactNode;
}) => {
  const colors = useColors();
  const day = dayjs(date);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
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
      {trailing}
    </View>
  );
};
