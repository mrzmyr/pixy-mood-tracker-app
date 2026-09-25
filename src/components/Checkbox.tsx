import { View } from "react-native";
import { Check } from "react-native-feather";
import useColors from "@/hooks/useColors";

/** Visual checkbox indicator only; the parent row handles presses. */
export const Checkbox = ({ checked }) => {
  const colors = useColors();

  return (
    <View
      style={{
        padding: 4,
        borderWidth: 2,
        borderColor: checked
          ? colors.checkboxCheckedBorder
          : colors.checkboxBorder,
        width: 22,
        height: 22,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 4,
        backgroundColor: checked
          ? colors.checkboxCheckedBackground
          : colors.checkboxBackground,
      }}
    >
      {checked && (
        <Check strokeWidth={3} width={12} color={colors.checkboxCheckedText} />
      )}
    </View>
  );
};
