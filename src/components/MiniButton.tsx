import useColors from "@/hooks/useColors";
import { Pressable, Text } from "react-native";
import { RADIUS } from "@/constants/Radius";

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
          marginRight: 8,
          marginBottom: 8,
        },
      ]}
      onPress={onPress}
      testID="log-tags-edit"
      accessibilityRole="button"
    >
      <Text
        style={{
          color: colors.primaryButtonText,
          fontSize: 17,
          fontWeight: "500",
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
};
