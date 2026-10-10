import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Pressable, Text } from "react-native";
import type { ViewStyle } from "react-native";

import useColors from "@/hooks/useColors";
import { dateFormat } from "@/lib/dateFormat";
import noop from "lodash/noop";

const Clock = ({
  timeDate,
}: {
  timeDate: Date;
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
  style?: ViewStyle;
}) => {
  const colors = useColors();

  return (
    <Pressable
      onPress={noop}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 8,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 5,
        paddingBottom: 5,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 17 }}>
        {dateFormat.time(timeDate)}
      </Text>
    </Pressable>
  );
};

export default Clock;
