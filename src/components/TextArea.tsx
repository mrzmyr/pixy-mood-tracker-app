import { forwardRef } from "react";
import { TextInput } from "react-native";
import type { TextStyle } from "react-native";

import useColors from "@/hooks/useColors";
import noop from "lodash/noop";
import { RADIUS } from "@/constants/Radius";

const TextAreaComponent = (
  {
    value = "",
    placeholder = "",
    accessibilityLabel,
    testID,
    maxLength = 500,
    autoFocus = false,
    style,
    onChange = noop,
  }: {
    value?: string;
    placeholder?: string;
    accessibilityLabel?: string;
    testID?: string;
    maxLength?: number;
    autoFocus?: boolean;
    style?: TextStyle;
    onChange?: (text: string) => void;
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
      value={value}
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
