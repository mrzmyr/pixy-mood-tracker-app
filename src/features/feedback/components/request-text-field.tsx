import { TextFieldRow } from "@/components/text-field-row";
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
}: RequestTextFieldProps) => (
  <TextFieldRow
    testID={testID}
    placeholder={placeholder}
    onChangeText={onChangeText}
    autoFocus={autoFocus}
    maxLength={maxLength}
    keyboardType={keyboardType}
    autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
  />
);
