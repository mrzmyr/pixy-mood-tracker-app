import { Text } from "react-native";
import type { TextStyle } from "react-native";

import useColors from "@/hooks/useColors";

const TextInfo = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) => {
  const colors = useColors();

  return (
    <Text
      style={[
        {
          fontSize: 13,
          color: colors.textSecondary,
          padding: 16,
          paddingTop: 0,
          marginTop: 8,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

export default TextInfo;
