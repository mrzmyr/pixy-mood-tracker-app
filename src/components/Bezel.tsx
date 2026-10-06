import type { ReactNode } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { BEZEL, getBezelRadius } from "@/constants/Bezel";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";

/**
 * Surface in a bezel: outer shell, gap, inner surface. `header` and
 * `footer` sit in the shell, above and below the inner surface.
 * `innerStyle` sets the inner background and layout.
 */
const Bezel = ({
  children,
  header,
  footer,
  radius = RADIUS.md,
  gap = BEZEL.gap,
  style,
  innerStyle,
  testID,
}: {
  children?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  /** Inner surface radius. The shell radius follows. */
  radius?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}) => {
  const colors = useColors();

  return (
    <View
      testID={testID}
      style={[
        {
          padding: gap,
          borderRadius: getBezelRadius(radius, gap),
          borderWidth: BEZEL.borderWidth,
          borderColor: colors.bezelBorder,
          backgroundColor: colors.bezelBackground,
          boxShadow: colors.bezelShadow,
        },
        style,
      ]}
    >
      {header}
      <View
        style={[
          {
            borderRadius: radius,
            borderWidth: BEZEL.borderWidth,
            borderColor: colors.bezelInnerBorder,
            overflow: "hidden",
          },
          innerStyle,
        ]}
      >
        {children}
      </View>
      {footer}
    </View>
  );
};

export default Bezel;
