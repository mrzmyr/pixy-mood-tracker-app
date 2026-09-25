import { forwardRef } from "react";
import type { ViewStyle } from "react-native";
import { TextInput } from "react-native";
import useColors from "@/hooks/useColors";

const TextAreaComponent = (
  {
    value = "",
    placeholder = "",
    testID,
    maxLength = 500,
    autoFocus = false,
    style,
    onChange = (text: string) => {},
  }: {
    value?: string;
    placeholder?: string;
    testID?: string;
    maxLength?: number;
    autoFocus?: boolean;
    style?: ViewStyle;
    onChange?: (text: string) => void;
  },
  ref: React.ForwardedRef<TextInput>
) => {
  const colors = useColors();

  return (
    <TextInput
      ref={ref}
      accessibilityLabel={placeholder}
      testID={testID}
      autoFocus={autoFocus}
      multiline
      onChangeText={(text) => {
        const newText = text.substring(0, maxLength);
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
        borderRadius: 8,
        ...style,
      }}
    />
  );
};

const TextArea = forwardRef(TextAreaComponent);

export default TextArea;
