import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { ViewStyle } from "react-native";
import { Platform, View, useWindowDimensions } from "react-native";

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
  const listRef = useRef<View>(null);

  // Android lists run edge to edge: grow past the screen padding on both sides.
  // Measured offsets are relative to the current bleed, so add them on top.
  // `getBoundingClientRect` reads the same window coordinates as
  // `measureInWindow`, but synchronously.
  const measureBleed = useCallback(() => {
    // The Jest test renderer gives refs without DOM methods.
    if (listRef.current?.getBoundingClientRect === undefined) {
      return;
    }
    const { x, width } = listRef.current.getBoundingClientRect();
    // Not laid out yet (detached or hidden): `onLayout` measures later.
    if (width === 0) {
      return;
    }
    const extraLeft = Math.round(x);
    const extraRight = Math.round(windowWidth - x - width);
    if (extraLeft === 0 && extraRight === 0) {
      return;
    }
    setBleed((current) => ({
      left: Math.max(0, current.left + extraLeft),
      right: Math.max(0, current.right + extraRight),
    }));
  }, [windowWidth]);

  // First bleed before paint: the list never shows inset. `onLayout` keeps it
  // current after rotation or resize.
  useLayoutEffect(() => {
    if (Platform.OS === "android") {
      measureBleed();
    }
  }, [measureBleed]);

  if (Platform.OS === "android") {
    return (
      <View
        ref={listRef}
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
