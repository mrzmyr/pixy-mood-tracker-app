import { Text } from "react-native";
import type { TextStyle } from "react-native";

import useColors from "@/hooks/use-colors";

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
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

export default TextInfo;
