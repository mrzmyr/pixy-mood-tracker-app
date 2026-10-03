import { useWeekLocale } from "@/hooks/useWeekLocale";
import dayjs from "dayjs";
import { Text, View } from "react-native";
import useColors from "@/hooks/useColors";

const HeaderDay = ({
  children,
  index,
}: {
  children: string;
  index: number;
}) => {
  const colors = useColors();
  return (
    <View
      style={{
        flex: 7,
        marginLeft: 3,
        marginRight: 3,
      }}
    >
      <Text
        testID={`calendar-weekday-${index}`}
        style={{
          fontSize: 12,
          fontWeight: "bold",
          color: colors.calendarWeekNameColor,
          textAlign: "center",
        }}
      >
        {children}
      </Text>
    </View>
  );
};

const CalendarHeader = () => {
  const locale = useWeekLocale();
  const colors = useColors();

  return (
    <View
      style={{
        width: "100%",
        paddingLeft: 16,
        paddingRight: 16,
        backgroundColor: colors.calendarBackground,

        shadowColor: "rgba(0, 0, 0, 0.6)",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowRadius: 1,
        shadowOpacity: 0.2,
        elevation: 3,
        zIndex: 3,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          marginLeft: -3,
          marginRight: -3,
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6].map((index) => (
          <HeaderDay key={index} index={index}>
            {dayjs()
              .locale(locale)
              .startOf("week")
              .add(index, "day")
              .format("ddd")}
          </HeaderDay>
        ))}
      </View>
    </View>
  );
};

export default CalendarHeader;
