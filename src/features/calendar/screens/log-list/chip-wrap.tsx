import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { INSET } from "./layout";

/**
 * Compact chips of a day view card, wrapped onto as many lines as they
 * need. A tap on the block calls `onPress`. With `accessibilityLabel`,
 * screen readers get the block as one button; without it, the block is not
 * focusable.
 */
export const ChipWrap = ({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: {
  children: ReactNode[];
  onPress?: () => void;
  accessibilityLabel?: string;
  /** What a tap does, read after the label. */
  accessibilityHint?: string;
  testID?: string;
}) => (
  <Pressable
    testID={testID}
    accessible={accessibilityLabel !== undefined}
    accessibilityRole={accessibilityLabel ? "button" : undefined}
    accessibilityLabel={accessibilityLabel}
    accessibilityHint={accessibilityHint}
    disabled={!onPress}
    onPress={onPress}
    style={{ paddingHorizontal: INSET }}
  >
    {/* Chips are pressable elsewhere; here they must not catch taps. */}
    <View
      pointerEvents="none"
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
    >
      {children}
    </View>
  </Pressable>
);
