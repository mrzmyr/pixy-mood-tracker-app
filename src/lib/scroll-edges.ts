import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

/** Whether a scroll event sits at the start or the end of its content. */
export const getScrollEdges = (
  event: NativeSyntheticEvent<NativeScrollEvent>,
  axis: "x" | "y"
) => {
  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
  const offset = axis === "x" ? contentOffset.x : contentOffset.y;
  const visible =
    axis === "x" ? layoutMeasurement.width : layoutMeasurement.height;
  const total = axis === "x" ? contentSize.width : contentSize.height;
  return { isAtStart: offset <= 1, isAtEnd: offset + visible >= total - 1 };
};
