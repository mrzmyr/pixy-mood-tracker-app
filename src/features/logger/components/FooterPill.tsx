import type { ReactElement } from "react";
import { Pressable, Text } from "react-native";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";

/** Height of a pill. Matches the 44pt minimum hit target. */
export const PILL_HEIGHT = 44;

/**
 * Rounded button with an icon and, with `label`, one line of text. Without
 * `label` it is a square icon button named by `accessibilityLabel`.
 */
export const FooterPill = ({
  icon,
  label,
  accessibilityLabel,
  accessibilityHint,
  testID,
  onPress,
}: {
  icon?: ReactElement;
  label?: string;
  accessibilityLabel: string;
  accessibilityHint: string;
  testID: string;
  onPress?: () => void;
}) => {
  const colors = useColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minHeight: PILL_HEIGHT,
        minWidth: PILL_HEIGHT,
        justifyContent: "center",
        flexShrink: 0,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: colors.logHeaderHighlight,
        borderRadius: RADIUS.sm,
      })}
    >
      {icon}
      {label !== undefined && (
        <Text
          numberOfLines={1}
          style={{
            fontSize: 17,
            fontWeight: "600",
            color: colors.logHeaderText,
            flexShrink: 1,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
};
