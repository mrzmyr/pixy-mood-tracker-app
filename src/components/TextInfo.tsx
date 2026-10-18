import { Text } from "react-native";
import type { TextStyle } from "react-native";

import useColors from "@/hooks/useColors";

const TextInfo = ({
  children,
  style,
  selectable,
}: {
  children: React.ReactNode;
  style?: TextStyle;
  /** Lets the user copy the text. Use for error messages, not for help. */
  selectable?: boolean;
}) => {
  const colors = useColors();

  return (
    <Text
      selectable={selectable}
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
