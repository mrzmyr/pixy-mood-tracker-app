import useToggleColors from "./useToggleColors";
import { Host, Switch } from "@expo/ui/jetpack-compose";
import { View } from "react-native";
import type { ToggleProps } from "./Toggle";

/** Material 3 switch. The wrapper view carries role, state and actions for TalkBack. */
const Toggle = ({
  value = false,
  disabled = false,
  onValueChange,
  accessibilityLabel,
  testID,
}: ToggleProps) => (
  <View
    accessible
    accessibilityRole="switch"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ checked: value, disabled }}
    accessibilityActions={[{ name: "activate" }]}
    onAccessibilityAction={(event) => {
      if (!disabled && event.nativeEvent.actionName === "activate") {
        onValueChange(!value);
      }
    }}
    testID={testID}
  >
    <Host matchContents>
      <Switch
        value={value}
        enabled={!disabled}
        onCheckedChange={onValueChange}
        colors={useToggleColors()}
      />
    </Host>
  </View>
);

export default Toggle;
