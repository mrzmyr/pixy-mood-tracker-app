import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";

import { Pressable, Text } from "react-native";
import type { ViewStyle } from "react-native";

import useColors from "@/hooks/useColors";
import { dateFormat, uses24hourClock } from "@/lib/dateFormat";

const Clock = ({
  timeDate,
  onChange,
  style,
}: {
  timeDate: Date;
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
  style: ViewStyle;
}) => {
  const colors = useColors();

  return (
    <Pressable
      onPress={() => {
        DateTimePickerAndroid.open({
          value: timeDate,
          is24Hour: uses24hourClock ?? true,
          mode: "time",
          onChange,
        });
      }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 8,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 5,
        paddingBottom: 5,
        ...style,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 17 }}>
        {dateFormat.time(timeDate)}
      </Text>
    </Pressable>
  );
};

export default Clock;
