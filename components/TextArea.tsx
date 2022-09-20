import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import useColors from "../hooks/useColors";

export default function TextArea({ 
  value = '',
  placeholder = '', 
  testID,
  maxLength = 500,
  autoFocus = false,
  style,
  containerStyle,
  onChange = (text: string) => {}, 
}: {
  value?: string,
  placeholder?: string,
  testID?: string,
  maxLength?: number,
  autoFocus?: boolean,
  style?: React.CSSProperties,
  containerStyle?: React.CSSProperties,
  onChange?: (text: string) => void,
}) {
  const colors = useColors()
  
  return (
    <TextInput
      testID={testID}
      autoFocus={autoFocus}
      multiline
      onChangeText={(text) => {
        const newText = text.substring(0, maxLength)
        onChange(newText)
      }}
      value={value}
      editable
      maxLength={maxLength}
      placeholder={placeholder}
      placeholderTextColor={colors.textInputPlaceholder}
      textAlignVertical={'top'}
      style={{
        borderWidth: 1,
        borderColor: colors.textInputBorder,
        backgroundColor: colors.textInputBackground,
        color: colors.textInputText,
        paddingTop: 16,
        padding: 16,
        fontSize: 17,
        height: 220,
        width: '100%',
        borderRadius: 8,
        ...style,
      }}
    />
  )
}