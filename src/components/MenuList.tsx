import React from "react";
import { View } from "react-native";
import type { ViewStyle } from "react-native";

import useColors from "@/hooks/useColors";
import { RADIUS } from "@/constants/Radius";

const DEFAULT_STYLE = {};

const MenuList = ({
  children,
  style = DEFAULT_STYLE,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) => {
  const colors = useColors();

  return (
    <View
      style={[
        {
          backgroundColor: colors.menuListItemBackground,
          borderRadius: RADIUS.md,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {/* Items draw a top divider; the shift clips the first one. */}
      <View style={{ marginTop: -1 }}>{children}</View>
    </View>
  );
};

export default MenuList;
