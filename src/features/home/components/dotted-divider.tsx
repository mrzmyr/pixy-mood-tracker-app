import { View } from "react-native";
import Svg, { Line } from "react-native-svg";
import useColors from "@/hooks/use-colors";
import { HOME_LAYOUT } from "../layout";

/**
 * Dotted line on the top edge of a row: round 2 pt dots every 7 pt, inside
 * the row's padding so it adds no height. SVG, because a native dotted
 * border draws solid on a single side.
 */
export const DottedDivider = () => {
  const colors = useColors();
  const { dotSize, dotGap } = HOME_LAYOUT;
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, left: 0, right: 0 }}
    >
      <Svg height={dotSize} width="100%" accessible={false}>
        <Line
          x1={dotSize / 2}
          y1={dotSize / 2}
          x2="100%"
          y2={dotSize / 2}
          stroke={colors.homeDivider}
          strokeWidth={dotSize}
          strokeLinecap="round"
          strokeDasharray={`0 ${dotSize + dotGap}`}
        />
      </Svg>
    </View>
  );
};
