import { Host, RadioButton } from "@expo/ui/jetpack-compose";
import { View } from "react-native";
import type { GestureResponderHandlers } from "react-native";
import useColors from "@/hooks/useColors";
import type { RadioMarkProps } from "./RadioMark";

/**
 * Makes the Compose host the JS touch responder, as in `Toggle.android.tsx`.
 * Without it the ancestor row `Pressable` takes the responder and Compose
 * gets a cancel, so a tap on the radio itself never selects.
 */
const claimTouch: GestureResponderHandlers = {
  onStartShouldSetResponder: () => true,
  onResponderTerminationRequest: () => false,
};

/**
 * Material 3 radio button of a radio menu row. The row carries role and
 * state for TalkBack, so the radio is hidden from it.
 */
const RadioMark = ({ selected, onSelect }: RadioMarkProps) => {
  const colors = useColors();

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Host matchContents {...claimTouch}>
        <RadioButton
          selected={selected}
          onClick={onSelect}
          colors={{
            selectedColor: colors.tint,
            unselectedColor: colors.textSecondary,
          }}
        />
      </Host>
    </View>
  );
};

export default RadioMark;
