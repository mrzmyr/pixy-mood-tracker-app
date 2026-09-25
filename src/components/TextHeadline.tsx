import type { ViewStyle } from "react-native";
import { Text } from "react-native";
import useColors from "@/hooks/useColors";

const TextHeadline = ({
  children,
  style = {},
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) => {
  const colors = useColors();
  return (
    <Text
      style={[
        {
          fontSize: 17,
          fontWeight: "bold",
          color: colors.text,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

export default TextHeadline;
