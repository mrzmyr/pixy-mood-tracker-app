import { Text, View } from "react-native";
import type { ViewStyle } from "react-native";

import useColors from "@/hooks/use-colors";
import type { TAG_COLOR_NAMES } from "@/constants/config";
import { RADIUS } from "@/constants/radius";
import { SPACE } from "@/constants/space";

const Indicator = ({
  children,
  colorName,
  style,
}: {
  children: React.ReactNode;
  colorName: (typeof TAG_COLOR_NAMES)[number];
  style?: ViewStyle;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        backgroundColor: colors.tags[colorName]?.background,
        padding: SPACE.xs,
        paddingLeft: SPACE.sm,
        paddingRight: SPACE.sm,
        borderRadius: RADIUS.sm,
        borderCurve: "continuous",
        ...style,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          color: colors.tags[colorName]?.text,
        }}
      >
        {children}
      </Text>
    </View>
  );
};

export default Indicator;
