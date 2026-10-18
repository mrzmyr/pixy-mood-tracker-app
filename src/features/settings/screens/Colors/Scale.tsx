import { View } from "react-native";
import useColors from "@/hooks/useColors";
import { RATING_KEYS } from "@/constants/Ratings";
import { ColorDot } from "./ColorDot";

/**
 * Dot size of a scale preview inside a native row. Fixed, because a hosted
 * React Native view inside a native row sizes to its content. Five dots plus
 * gaps fit the narrowest iPhone row.
 */
export const SCALE_ROW_DOT_SIZE = 32;

const ROW_DOT_GAP = 8;

/**
 * Preview of a color scale, best rating on the left. `type` must be a key
 * of `colors.scales`. Without `dotSize` the dots stretch to the full width.
 */
export const Scale = ({
  type,
  dotSize,
}: {
  type: string;
  dotSize?: number;
}) => {
  const colors = useColors();
  const scaleColors = colors.scales[type];
  const scaleKeys = [...RATING_KEYS].reverse();

  if (dotSize !== undefined) {
    return (
      <View style={{ flexDirection: "row", gap: ROW_DOT_GAP }}>
        {scaleKeys.map((key) => (
          <ColorDot
            key={key}
            color={scaleColors[key].background}
            size={dotSize}
          />
        ))}
      </View>
    );
  }

  return (
    <View
      style={{
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {scaleKeys.map((key) => (
        <ColorDot key={key} color={scaleColors[key].background} />
      ))}
    </View>
  );
};
