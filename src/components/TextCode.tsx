import type { StyleProp, TextStyle } from "react-native";
import { Platform, Text } from "react-native";
import useColors from "@/hooks/useColors";

const fontFamily = Platform.OS === "ios" ? "Courier New" : "monospace";

const TextCode = ({
  children,
  style = null,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) => {
  const colors = useColors();

  return (
    <Text
      style={[{ fontFamily, color: colors.text, fontWeight: "bold" }, style]}
    >
      {children}
    </Text>
  );
};

export default TextCode;
