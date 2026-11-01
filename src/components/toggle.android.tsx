import { Host, Switch } from "@expo/ui/jetpack-compose";
import { View } from "react-native";
import type { GestureResponderHandlers } from "react-native";
import type { ToggleProps } from "./toggle";
import { MATERIAL_SEED_COLOR } from "@/constants/colors";

/**
 * Makes the Compose host the JS touch responder, as React Native's `Switch`
 * does. Without it an ancestor `Pressable` (a `MenuListItem` row) takes the
 * responder. Android then intercepts the gesture at that ancestor and sends
 * the switch a cancel, so a normal tap never toggles. The host is not an
 * intercepting React Native view, so the gesture still reaches Compose.
 */
const claimTouch: GestureResponderHandlers = {
  onStartShouldSetResponder: () => true,
  onResponderTerminationRequest: () => false,
};

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
    <Host matchContents seedColor={MATERIAL_SEED_COLOR} {...claimTouch}>
      <Switch
        value={value}
        enabled={!disabled}
        onCheckedChange={onValueChange}
      />
    </Host>
  </View>
);

export default Toggle;
