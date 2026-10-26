import Check from "lucide-react-native/icons/check";
import { Pressable, Text, View } from "react-native";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";

/**
 * Frosted answer row on the sky. `multiple` rows act as checkboxes, the
 * others as radio buttons.
 */
export const OptionRow = ({
  label,
  description,
  emoji,
  isSelected,
  multiple = false,
  onPress,
  testID,
}: {
  label: string;
  description?: string;
  emoji?: string;
  isSelected: boolean;
  multiple?: boolean;
  onPress: () => void;
  testID?: string;
}) => {
  const colors = useColors();

  return (
    <Pressable
      testID={testID}
      accessibilityRole={multiple ? "checkbox" : "radio"}
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={description ? `${label}, ${description}` : label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 56,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: RADIUS.md,
        borderWidth: 2,
        borderColor: isSelected ? colors.tint : colors.onboardingCardBorder,
        backgroundColor: colors.onboardingCardBackground,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {emoji ? (
        <Text style={{ fontSize: 22 }} importantForAccessibility="no">
          {emoji}
        </Text>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.onboardingTitle,
            fontSize: 17,
            lineHeight: 22,
            fontWeight: "600",
          }}
        >
          {label}
        </Text>
        {description ? (
          <Text
            style={{
              color: colors.onboardingBody,
              fontSize: 15,
              lineHeight: 20,
              marginTop: 2,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: multiple ? RADIUS.xs + 2 : RADIUS.full,
          borderWidth: 2,
          borderColor: isSelected ? colors.tint : colors.onboardingBody,
          backgroundColor: isSelected ? colors.tint : "transparent",
          alignItems: "center",
          justifyContent: "center",
          opacity: isSelected ? 1 : 0.5,
        }}
      >
        {isSelected ? (
          <Check width={16} height={16} color={colors.primaryButtonText} />
        ) : null}
      </View>
    </Pressable>
  );
};
