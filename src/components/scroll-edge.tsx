import { requireNativeView, requireOptionalNativeModule } from "expo";
import type { ReactNode } from "react";
import { View } from "react-native";
import type { ViewStyle } from "react-native";

const MODULE_NAME = "PixyMoodTrackerScrollEdge";

interface ScrollEdgeProps {
  style?: ViewStyle;
  children: ReactNode;
}

/**
 * Native view from `modules/pixy-mood-tracker-scroll-edge`, or `null` where
 * it is missing: Android, web, Jest, and dev clients built before it.
 */
const NativeScrollEdge = requireOptionalNativeModule(MODULE_NAME)
  ? requireNativeView<ScrollEdgeProps>(MODULE_NAME)
  : null;

/**
 * Links the first scroll view inside to the iOS navigation bar, so a large
 * title collapses on scroll. Needed around an `@expo/ui` `Host`: its SwiftUI
 * scroll view sits too deep for UIKit to find. Plain `View` elsewhere.
 */
export const ScrollEdge = ({ style, children }: ScrollEdgeProps) =>
  NativeScrollEdge ? (
    <NativeScrollEdge style={style}>{children}</NativeScrollEdge>
  ) : (
    <View style={style}>{children}</View>
  );
