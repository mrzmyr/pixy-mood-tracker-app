import { useEffect } from "react";
import { AccessibilityInfo, Platform } from "react-native";
import { Copy } from "@/components/typography";
import type { FlexStyle } from "react-native";
import useColors from "@/hooks/use-colors";

/** Layout only: the error keeps its own color and font. */
type FieldErrorStyle = Pick<
  FlexStyle,
  | "flex"
  | "margin"
  | "marginTop"
  | "marginBottom"
  | "marginHorizontal"
  | "marginVertical"
  | "padding"
  | "paddingTop"
  | "paddingBottom"
  | "paddingHorizontal"
  | "paddingVertical"
>;

/**
 * Helper text under an input that reports a validation error.
 * Drawn in the error color.
 *
 * Screen readers announce it when it appears: VoiceOver through
 * `announceForAccessibility`, TalkBack through the live region.
 */
export const FieldError = ({
  children,
  testID,
  style,
}: {
  /** What is wrong and how to fix it. */
  children: string;
  testID?: string;
  style?: FieldErrorStyle;
}) => {
  const colors = useColors();

  useEffect(() => {
    if (Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibility(children);
    }
  }, [children]);

  return (
    <Copy
      size={13}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID={testID}
      style={[{ color: colors.dangerButtonText }, style]}
    >
      {children}
    </Copy>
  );
};
