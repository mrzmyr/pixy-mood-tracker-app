import { View } from "react-native";
import useColors from "../../hooks/useColors";
import { RATING_KEYS } from "@/constants/Ratings";
import { ColorDot } from "./ColorDot";

/**
 * Preview of a color scale, best rating on the left. `type` must be a key
 * of `colors.scales`.
 */
export const Scale = ({ type }: { type: string }) => {
  const colors = useColors();
  const scaleColors = colors.scales[type];
  const scaleKeys = RATING_KEYS.toReversed();

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
