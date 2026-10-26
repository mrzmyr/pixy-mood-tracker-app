import { TextInput } from "@expo/ui";
import type { RequestTextFieldProps } from "./request-text-field-types";

/**
 * Text row inside the native request form: SwiftUI `TextField` on iOS,
 * Compose text field on Android. Web:
 * [request-text-field.tsx](./request-text-field.tsx).
 */
export const RequestTextField = ({
  placeholder,
  onChangeText,
  testID,
  autoFocus = false,
  maxLength,
  keyboardType = "default",
}: RequestTextFieldProps) => {
  const isEmail = keyboardType === "email-address";

  return (
    <TextInput
      testID={testID}
      defaultValue=""
      placeholder={placeholder}
      onChangeText={onChangeText}
      autoFocus={autoFocus}
      maxLength={maxLength}
      keyboardType={keyboardType}
      autoCapitalize={isEmail ? "none" : "sentences"}
      autoCorrect={!isEmail}
      autoComplete={isEmail ? "email" : undefined}
      returnKeyType="done"
    />
  );
};
