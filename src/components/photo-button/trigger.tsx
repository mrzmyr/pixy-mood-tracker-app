import { Pressable } from "react-native";
import { Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import usePressRipple from "@/hooks/use-press-ripple";
import { RADIUS } from "@/constants/radius";

/**
 * Tonal pill that opens the library or the photo menu on Android and web.
 * Material 3 tonal button: 40 dp high inside a 48 dp touch target.
 */
export const Trigger = ({
  label,
  testID,
  onPress,
}: {
  label: string;
  testID: string;
  onPress: () => void;
}) => {
  const colors = useColors();
  const ripple = usePressRipple({ foreground: true });

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={ripple}
      hitSlop={4}
      style={({ pressed }) => ({
        height: 40,
        paddingHorizontal: 20,
        borderRadius: RADIUS.full,
        overflow: "hidden",
        justifyContent: "center",
        backgroundColor: colors.secondaryButtonBackground,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Label size={14} strong style={{ color: colors.secondaryButtonText }}>
        {label}
      </Label>
    </Pressable>
  );
};
