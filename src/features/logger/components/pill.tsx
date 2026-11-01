import type { ReactElement } from "react";
import { Pressable, View } from "react-native";
import type { ViewStyle } from "react-native";
import { Label } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";

/** Height of a pill. Matches the 44pt minimum hit target. */
export const PILL_HEIGHT = 44;

const usePillStyle = (): ViewStyle => {
  const colors = useColors();
  return {
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
    borderCurve: "continuous",
  };
};

const PillText = ({ label }: { label: string }) => {
  const colors = useColors();
  return (
    <Label
      size={16}
      strong
      numberOfLines={1}
      style={{
        color: colors.logHeaderText,
        flexShrink: 1,
      }}
    >
      {label}
    </Label>
  );
};

/**
 * Look of a pill without touch handling or accessibility: the label of a
 * native menu, which handles both.
 */
export const PillFace = ({
  icon,
  label,
}: {
  icon: ReactElement;
  label: string;
}) => {
  const style = usePillStyle();

  return (
    <View
      style={style}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {icon}
      <PillText label={label} />
    </View>
  );
};

/**
 * Rounded button with an icon and, with `label`, one line of text. Without
 * `label` it is a square icon button named by `accessibilityLabel`.
 */
export const Pill = ({
  icon,
  label,
  accessibilityLabel,
  accessibilityHint,
  testID,
  onPress,
}: {
  icon: ReactElement;
  label?: string;
  accessibilityLabel: string;
  accessibilityHint: string;
  testID: string;
  onPress: () => void;
}) => {
  const style = usePillStyle();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [style, { opacity: pressed ? 0.8 : 1 }]}
    >
      {icon}
      {label !== undefined && <PillText label={label} />}
    </Pressable>
  );
};
