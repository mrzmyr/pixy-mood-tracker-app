import { Pressable, Text } from "react-native";
import type { ViewStyle } from "react-native";

import useColors from "@/hooks/use-colors";
import { formatReminderTime } from "../reminder-time";
import noop from "lodash/noop";
import { RADIUS } from "@/constants/radius";
import type { ClockProps } from "./clock-types";

const Clock = ({
  timeDate,
  background,
}: ClockProps & { style?: ViewStyle }) => {
  const colors = useColors();

  return (
    <Pressable
      onPress={noop}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: background ?? colors.backgroundSecondary,
        borderRadius: RADIUS.sm,
        borderCurve: "continuous",
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 5,
        paddingBottom: 5,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: 17,
          fontVariant: ["tabular-nums"],
        }}
      >
        {formatReminderTime(timeDate)}
      </Text>
    </Pressable>
  );
};

export default Clock;
