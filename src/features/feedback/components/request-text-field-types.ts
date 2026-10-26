/** One text row of the request form. Uncontrolled: starts empty. */
export interface RequestTextFieldProps {
  placeholder: string;
  onChangeText: (text: string) => void;
  testID: string;
  autoFocus?: boolean;
  maxLength?: number;
  keyboardType?: "default" | "email-address";
}
