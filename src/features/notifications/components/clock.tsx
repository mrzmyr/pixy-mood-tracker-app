import { Pressable } from "react-native";
import type { ViewStyle } from "react-native";

import { Label } from "@/components/typography";
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
      <Label
        size={16}
        style={{ color: colors.text, fontVariant: ["tabular-nums"] }}
      >
        {formatReminderTime(timeDate)}
      </Label>
    </Pressable>
  );
};

export default Clock;
