import chroma from "chroma-js";
import { Pressable, Text, useColorScheme } from "react-native";
import Check from "lucide-react-native/icons/check";
import { RADIUS } from "@/constants/Radius";

const ScaleButton = ({
  backgroundColor,
  textColor,
  isSelected = false,
  accessibilityLabel,
  onPress,
}: {
  backgroundColor: string;
  textColor: string;
  isSelected?: boolean;
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
              ? chroma(backgroundColor).darken(0.4).hex()
              : chroma(backgroundColor).brighten(0.5).hex(),
          backgroundColor,
          opacity: pressed ? 0.8 : 1,
          flex: 7,
          borderRadius: RADIUS.sm,
          width: "100%",
          aspectRatio: 1,
          justifyContent: "center",
          alignItems: "center",
        },
      ]}
      testID={`scale-button-${accessibilityLabel}`}
      accessibilityLabel={accessibilityLabel}
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
