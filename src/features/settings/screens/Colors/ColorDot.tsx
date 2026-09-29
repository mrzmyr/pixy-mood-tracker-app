import { View } from "react-native";

/** Square color swatch in a scale preview row. */
export const ColorDot = ({ color }: { color: string }) => (
  <View
    style={{
      padding: 3,
      backgroundColor: color,
      flex: 1,
      borderRadius: 4,
      width: "100%",
      aspectRatio: 1,
      margin: 4,
      justifyContent: "center",
      alignItems: "center",
      maxWidth: 50,
    }}
  />
);
