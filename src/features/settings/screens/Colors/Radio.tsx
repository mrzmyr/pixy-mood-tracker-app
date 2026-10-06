import { useCallback } from "react";
import { Pressable, View } from "react-native";
import { Circle } from "react-native-feather";
import Bezel from "@/components/Bezel";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { RADIUS } from "@/constants/Radius";

/** Selectable row on the color scale screen, in a bezel. */
export const Radio = ({
  onPress,
  children,
  isSelected = false,
}: {
  onPress: () => void;
  children: React.ReactNode;
  isSelected?: boolean;
}) => {
  const colors = useColors();
  const haptics = useHaptics();

  const _onPress = useCallback(() => {
    haptics.selection();
    onPress();
  }, [onPress, haptics]);

  return (
    <Pressable
      onPress={_onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      style={({ pressed }) => ({
        marginBottom: 12,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Bezel
        radius={RADIUS.md}
        innerStyle={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          backgroundColor: colors.menuListItemBackground,
        }}
      >
        <View
          style={{
            justifyContent: "center",
            flexDirection: "row",
            position: "relative",
            marginRight: 16,
            marginLeft: 8,
          }}
        >
          <Circle width={24} color={colors.text} />
          {isSelected && (
            <View
              style={{
                width: 10,
                height: 10,
                backgroundColor: colors.text,
                position: "absolute",
                borderRadius: RADIUS.full,
                top: 7,
              }}
            />
          )}
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </Bezel>
    </Pressable>
  );
};
