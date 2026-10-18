import { forwardRef } from "react";
import { TextInput } from "react-native";
import type { TextInputInstance, TextStyle } from "react-native";

import useColors from "@/hooks/useColors";
import noop from "lodash/noop";
import { RADIUS } from "@/constants/Radius";

const TextAreaComponent = (
  {
    value,
    defaultValue,
    placeholder = "",
    accessibilityLabel,
    testID,
    maxLength = 500,
    autoFocus = false,
    style,
    onChange = noop,
    onBlur,
  }: {
    /** Controlled text. Omit and pass `defaultValue` to let the input own it. */
    value?: string;
    /** Start text of an uncontrolled input. */
    defaultValue?: string;
    placeholder?: string;
    accessibilityLabel?: string;
    testID?: string;
    maxLength?: number;
    autoFocus?: boolean;
    style?: TextStyle;
    onChange?: (text: string) => void;
    onBlur?: () => void;
  },
  ref: React.ForwardedRef<TextInputInstance>
) => {
  const colors = useColors();

  return (
    <TextInput
      ref={ref}
      accessibilityLabel={accessibilityLabel || placeholder || undefined}
      testID={testID}
      autoFocus={autoFocus}
      multiline
      onChangeText={(text) => {
        const newText = text.slice(0, maxLength);
        onChange(newText);
      }}
      value={value}
      defaultValue={value === undefined ? defaultValue : undefined}
      onBlur={onBlur}
      maxLength={maxLength}
      placeholder={placeholder}
      placeholderTextColor={colors.textInputPlaceholder}
      textAlignVertical="top"
      style={{
        borderWidth: 1,
        borderColor: colors.textInputBorder,
        backgroundColor: colors.textInputBackground,
        color: colors.textInputText,
        paddingTop: 16,
        padding: 16,
        fontSize: 17,
        height: "100%",
        width: "100%",
        borderRadius: RADIUS.sm,
        ...style,
      }}
    />
  );
};

const TextArea = forwardRef(TextAreaComponent);

export default TextArea;
