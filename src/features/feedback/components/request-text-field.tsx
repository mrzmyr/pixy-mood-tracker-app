import { TextInput } from "react-native";
import useColors from "@/hooks/use-colors";
import type { RequestTextFieldProps } from "./request-text-field-types";

/**
 * Text row of the request form on web, inside a `MenuList`. iOS and
 * Android: [request-text-field.native.tsx](./request-text-field.native.tsx).
 */
export const RequestTextField = ({
  placeholder,
  onChangeText,
  testID,
  autoFocus = false,
  maxLength,
  keyboardType = "default",
}: RequestTextFieldProps) => {
  const colors = useColors();

  return (
    <TextInput
      testID={testID}
      accessibilityLabel={placeholder}
      placeholder={placeholder}
      placeholderTextColor={colors.textInputPlaceholder}
      onChangeText={onChangeText}
      autoFocus={autoFocus}
      maxLength={maxLength}
      keyboardType={keyboardType}
      autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
      style={{
        fontSize: 17,
        color: colors.text,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    />
  );
};
