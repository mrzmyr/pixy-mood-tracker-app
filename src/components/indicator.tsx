import { View } from "react-native";
import type { ViewStyle } from "react-native";

import { Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import type { TAG_COLOR_NAMES } from "@/constants/config";
import { RADIUS } from "@/constants/radius";

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
        padding: 4,
        paddingLeft: 8,
        paddingRight: 8,
        borderRadius: RADIUS.sm,
        borderCurve: "continuous",
        ...style,
      }}
    >
      <Label size={14} style={{ color: colors.tags[colorName]?.text }}>
        {children}
      </Label>
    </View>
  );
};

export default Indicator;
