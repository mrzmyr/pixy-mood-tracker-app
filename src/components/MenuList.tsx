import React from "react";
import type { ViewStyle } from "react-native";
import { View } from "react-native";

import Bezel from "@/components/Bezel";
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
    <Bezel
      radius={RADIUS.md}
      style={style}
      innerStyle={{ backgroundColor: colors.menuListItemBackground }}
    >
      {/* Items draw a top divider; the shift clips the first one. */}
      <View style={{ marginTop: -1 }}>{children}</View>
    </Bezel>
  );
};

export default MenuList;
