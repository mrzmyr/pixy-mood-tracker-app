import { Switch } from "react-native";

/** Controlled only: `value` is the source of truth, no internal state. */
export interface ToggleProps {
  value?: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * On/off control. System `Switch` on iOS and web; Material 3 switch on
 * Android ([Toggle.android.tsx](./Toggle.android.tsx)). Use instead of
 * `Switch` from `react-native`.
 */
const Toggle = ({
  value,
  disabled,
  onValueChange,
  accessibilityLabel,
  testID,
}: ToggleProps) => (
  <Switch
    accessibilityLabel={accessibilityLabel}
    testID={testID}
    disabled={disabled}
    onValueChange={onValueChange}
    value={value}
  />
);

export default Toggle;
