import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { Pressable, Text } from "react-native";

/** Small pill button that plays selection haptics before `onPress`. */
export const MiniButton = ({
  onPress,
  children,
}: {
  onPress: () => void;
  children: React.ReactNode;
}) => {
  const colors = useColors();
  const haptics = useHaptics();

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
          borderRadius: 100,
          backgroundColor: colors.primaryButtonBackground,
          opacity: pressed ? 0.8 : 1,
          marginRight: 8,
          marginBottom: 8,
        },
      ]}
      onPress={async () => {
        await haptics.selection();
        onPress?.();
      }}
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
