import { Pressable, Text } from "react-native";
import useColors from "@/hooks/useColors";

/** Digit key of the passcode keypad; reports its own `value` on press. */
export const PasscodePadButton = ({
  value,
  onPress,
}: {
  value: string;
  onPress: (value: string) => void;
}) => {
  const colors = useColors();

  return (
    <Pressable
      onPress={() => onPress(value)}
      style={({ pressed }) => ({
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 999,
        width: 80,
        height: 80,
        margin: 10,
        backgroundColor: pressed
          ? colors.passcodePadBackgroundActive
          : colors.passcodePadBackground,
      })}
    >
      <Text
        style={{
          fontSize: 28,
          color: colors.text,
          marginTop: -3,
          padding: 25,
        }}
      >
        {value}
      </Text>
    </Pressable>
  );
};
