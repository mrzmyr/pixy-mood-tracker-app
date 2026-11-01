import dayjs from "dayjs";
import { View } from "react-native";
import useColors from "@/hooks/use-colors";
import { Label } from "@/components/typography";

const HeaderDay = ({ children }: { children: string }) => {
  const colors = useColors();
  return (
    <View
      style={{
        flex: 7,
      }}
    >
      <Label
        size={14}
        strong
        style={{
          color: colors.statisticsWeekdayText,
          textAlign: "center",
        }}
      >
        {children}
      </Label>
    </View>
  );
};

/**
 * Seven weekday labels starting at `date`; pass a week start so the
 * columns match the week rows below.
 */
export const HeaderWeek = ({ date }: { date: string }) => {
  const colors = useColors();
  const start = dayjs(date);

  return (
    <View
      style={{
        width: "100%",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          borderTopColor: colors.statisticsWeekdayBorder,
          borderTopWidth: 1,
          borderBottomColor: colors.statisticsWeekdayBorder,
          borderBottomWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        <HeaderDay>{start.add(0, "day").format("ddd")}</HeaderDay>
        <HeaderDay>{start.add(1, "day").format("ddd")}</HeaderDay>
        <HeaderDay>{start.add(2, "day").format("ddd")}</HeaderDay>
        <HeaderDay>{start.add(3, "day").format("ddd")}</HeaderDay>
        <HeaderDay>{start.add(4, "day").format("ddd")}</HeaderDay>
        <HeaderDay>{start.add(5, "day").format("ddd")}</HeaderDay>
        <HeaderDay>{start.add(6, "day").format("ddd")}</HeaderDay>
      </View>
    </View>
  );
};
