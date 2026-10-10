import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import { Pressable, Text } from "react-native";
import type { ViewStyle } from "react-native";

import useColors from "@/hooks/useColors";
import noop from "lodash/noop";
import { RADIUS } from "@/constants/Radius";

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
        borderRadius: RADIUS.sm,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 5,
        paddingBottom: 5,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 17 }}>
        {dayjs(timeDate).format("HH:mm")}
      </Text>
    </Pressable>
  );
};

export default Clock;
