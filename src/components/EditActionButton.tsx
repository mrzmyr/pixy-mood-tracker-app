import { useState } from "react";
import { Pressable } from "react-native";
import { Check, X } from "react-native-feather";
import useColors from "@/hooks/useColors";
import type { EditActionButtonProps } from "./EditActionButton.types";

/** Circular edit action with a 48dp target on Android and web. */
export const EditActionButton = ({
  action,
  label,
  onPress,
  testID,
}: EditActionButtonProps) => {
  const colors = useColors();
  const [isFocused, setIsFocused] = useState(false);
  const isSave = action === "save";
  const Icon = isSave ? Check : X;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: false }}
      testID={testID}
      onPress={onPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      android_ripple={{ color: colors.logHeaderHighlight, borderless: false }}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isSave
          ? colors.primaryButtonBackground
          : colors.backgroundSecondary,
        borderWidth: 2,
        borderColor: isFocused ? colors.text : "transparent",
        opacity: pressed ? 0.7 : 1,
        overflow: "hidden",
      })}
    >
      <Icon
        width={24}
        height={24}
        color={isSave ? colors.primaryButtonText : colors.text}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );
};
