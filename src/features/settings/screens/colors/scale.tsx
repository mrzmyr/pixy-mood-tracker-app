import { View } from "react-native";
import useColors from "@/hooks/use-colors";
import { RATING_KEYS } from "@/constants/ratings";
import { ColorDot } from "./color-dot";

/**
 * Preview of a color scale, best rating on the left. `type` must be a key
 * of `colors.scales`.
 */
export const Scale = ({ type }: { type: string }) => {
  const colors = useColors();
  const scaleColors = colors.scales[type];
  const scaleKeys = [...RATING_KEYS].reverse();

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
