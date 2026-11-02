import { requireNativeView, requireOptionalNativeModule } from "expo";
import type { ReactNode } from "react";
import { View } from "react-native";
import type { ViewStyle } from "react-native";

const MODULE_NAME = "PixyMoodTrackerTextWrap";

interface TextWrapProps {
  /** `testID`s of the floating buttons the text wraps around. */
  avoidTestIDs: string[];
  /** Space between text and button. */
  gap: number;
  style?: ViewStyle;
  children: ReactNode;
}

/**
 * Native view from `modules/pixy-mood-tracker-text-wrap`, or `null` where it
 * is missing: web, Jest, and dev clients built before it.
 */
const NativeTextWrap = requireOptionalNativeModule(MODULE_NAME)
  ? requireNativeView<TextWrapProps>(MODULE_NAME)
  : null;

/**
 * Wraps the text of the multiline input inside around a floating button.
 * Only the button area is carved out: lines that would run under it break
 * early, all other lines keep the full width. Plain `View` where the native
 * view is missing.
 */
export const TextWrap = ({ style, children, ...props }: TextWrapProps) =>
  NativeTextWrap ? (
    <NativeTextWrap style={style} {...props}>
      {children}
    </NativeTextWrap>
  ) : (
    <View style={style}>{children}</View>
  );
