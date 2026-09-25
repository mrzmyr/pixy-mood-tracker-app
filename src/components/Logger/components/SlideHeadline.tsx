import type { ViewStyle } from "react-native";
import { Text, View } from "react-native";
import useColors from "@/hooks/useColors";

const DEFAULT_STYLE = {};

/** Bold headline at the top of a logger slide. */
export const SlideHeadline = ({
  children,
  style = DEFAULT_STYLE,
}: {
  children: string;
  style?: ViewStyle;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: "row",
        ...style,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: 20,
          fontWeight: "bold",
        }}
      >
        {children}
      </Text>
    </View>
  );
};
