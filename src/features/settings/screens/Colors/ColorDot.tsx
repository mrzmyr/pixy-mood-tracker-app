import { View } from "react-native";
import { BEZEL, getBezelEdgeColor } from "@/constants/Bezel";
import { RADIUS } from "@/constants/Radius";

/** Square color swatch in a scale preview row, with a darker edge. */
export const ColorDot = ({ color }: { color: string }) => (
  <View
    style={{
      padding: 3,
      backgroundColor: color,
      borderWidth: BEZEL.borderWidth,
      borderColor: getBezelEdgeColor(color),
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
);
