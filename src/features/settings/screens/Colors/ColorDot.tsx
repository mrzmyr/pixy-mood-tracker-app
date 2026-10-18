import { View } from "react-native";
import { RADIUS } from "@/constants/Radius";

/**
 * Square color swatch in a scale preview row. With `size` the swatch is
 * fixed; without it, it stretches up to 50 points.
 */
export const ColorDot = ({ color, size }: { color: string; size?: number }) =>
  size === undefined ? (
    <View
      style={{
        padding: 3,
        backgroundColor: color,
        flex: 1,
        borderRadius: RADIUS.xs,
        width: "100%",
        aspectRatio: 1,
        margin: 4,
        justifyContent: "center",
        alignItems: "center",
        maxWidth: 50,
      }}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: RADIUS.xs,
      }}
    />
  );
