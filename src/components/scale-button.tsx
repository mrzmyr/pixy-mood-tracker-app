import chroma from "chroma-js";
import { Pressable, Text, useColorScheme } from "react-native";
import Check from "lucide-react-native/icons/check";
import { RADIUS } from "@/constants/radius";

const ScaleButton = ({
  backgroundColor,
  textColor,
  isSelected = false,
  multiSelect = false,
  accessibilityLabel,
  onPress,
}: {
  backgroundColor: string;
  textColor: string;
  isSelected?: boolean;
  /** Several values can be selected, so screen readers get checkboxes. */
  multiSelect?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
}) => {
  const colorScheme = useColorScheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderColor:
            colorScheme === "light"
              ? // oxlint-disable-next-line pixy-standards/no-color-shading -- scale buttons predate scale borders
                chroma(backgroundColor).darken(0.4).hex()
              : // oxlint-disable-next-line pixy-standards/no-color-shading -- scale buttons predate scale borders
                chroma(backgroundColor).brighten(0.5).hex(),
          backgroundColor,
          opacity: pressed ? 0.8 : 1,
          flex: 7,
          borderRadius: RADIUS.sm,
          borderCurve: "continuous",
          width: "100%",
          aspectRatio: 1,
          justifyContent: "center",
          alignItems: "center",
        },
      ]}
      testID={`scale-button-${accessibilityLabel}`}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={multiSelect ? "checkbox" : "radio"}
      accessibilityState={
        multiSelect ? { checked: isSelected } : { selected: isSelected }
      }
      accessible={true}
    >
      {isSelected ? (
        <Check color={textColor} width={24} />
      ) : (
        <Text>&nbsp;</Text>
      )}
    </Pressable>
  );
};

export default ScaleButton;
