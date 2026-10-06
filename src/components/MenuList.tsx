import React, { useCallback, useState } from "react";
import type { LayoutChangeEvent, ViewStyle } from "react-native";
import { Platform, View, useWindowDimensions } from "react-native";

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
  const { width: windowWidth } = useWindowDimensions();
  const [bleed, setBleed] = useState({ left: 0, right: 0 });
  const [listRef, setListRef] = useState<View | null>(null);

  // Android lists run edge to edge: grow past the screen padding on both sides.
  // Measured offsets are relative to the current bleed, so add them on top.
  const measureBleed = useCallback(
    (_event: LayoutChangeEvent) => {
      listRef?.measureInWindow((x, _y, width) => {
        const extraLeft = Math.round(x);
        const extraRight = Math.round(windowWidth - x - width);
        if (extraLeft === 0 && extraRight === 0) {
          return;
        }
        setBleed((current) => ({
          left: Math.max(0, current.left + extraLeft),
          right: Math.max(0, current.right + extraRight),
        }));
      });
    },
    [listRef, windowWidth]
  );

  if (Platform.OS === "android") {
    return (
      <View
        ref={setListRef}
        onLayout={measureBleed}
        testID="menu-list-flat"
        style={[
          { backgroundColor: colors.menuListItemBackground },
          style,
          { marginLeft: -bleed.left, marginRight: -bleed.right },
        ]}
      >
        {children}
      </View>
    );
  }

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
