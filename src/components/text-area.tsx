import { forwardRef } from "react";
import { TextInput } from "react-native";
import type { TextInputProps, TextStyle } from "react-native";

import { getTextStyle } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import noop from "lodash/noop";
import { RADIUS } from "@/constants/radius";

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
    onSelectionChange,
    children,
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
    onSelectionChange?: TextInputProps["onSelectionChange"];
    /**
     * Styled text spans instead of `value`. Their text must equal the text
     * the input reports through `onChange`.
     */
    children?: React.ReactNode;
  },
  ref: React.ForwardedRef<TextInput>
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
      value={children === undefined ? value : undefined}
      defaultValue={
        value === undefined && children === undefined ? defaultValue : undefined
      }
      onBlur={onBlur}
      onSelectionChange={onSelectionChange}
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
        ...getTextStyle("copy", 16),
        height: "100%",
        width: "100%",
        borderRadius: RADIUS.sm,
        borderCurve: "continuous",
        ...style,
      }}
    >
      {children}
    </TextInput>
  );
};

const TextArea = forwardRef(TextAreaComponent);

export default TextArea;
