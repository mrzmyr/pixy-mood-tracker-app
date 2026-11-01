import useColors from "@/hooks/use-colors";
import { Pressable } from "react-native";
import { Label } from "@/components/typography";
import { RADIUS } from "@/constants/radius";

/** Small pill button that calls `onPress`. */
export const MiniButton = ({
  onPress,
  children,
}: {
  onPress: () => void;
  children: React.ReactNode;
}) => {
  const colors = useColors();

  return (
    <Pressable
      style={({ pressed }) => [
        {
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 16,
          paddingRight: 16,
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "row",
          borderRadius: RADIUS.full,
          backgroundColor: colors.primaryButtonBackground,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      onPress={onPress}
      testID="log-tags-edit"
      accessibilityRole="button"
    >
      <Label
        size={16}
        style={{
          color: colors.primaryButtonText,
          fontWeight: "500",
        }}
      >
        {children}
      </Label>
    </Pressable>
  );
};
