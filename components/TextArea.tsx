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

  const [text, setText] = useState(value)
  
  return (
    <View style={{
      ...containerStyle,
      marginTop: 10,
      width: '100%',
      position: 'relative',
    }}>
      <TextInput
        testID={testID}
        autoFocus={autoFocus}
        multiline
        onChangeText={(text) => {
          const newText = text.substring(0, maxLength)
          onChange(newText)
          setText(newText)
        }}
        value={text}
        editable
        maxLength={maxLength}
        placeholder={placeholder}
        placeholderTextColor={colors.textInputPlaceholder}
        textAlignVertical={'top'}
        style={{
          backgroundColor: colors.textInputBackground,
          color: colors.textInputText,
          padding: 15,
          paddingTop: 15,
          fontSize: 17,
          height: 280,
          width: '100%',
          borderRadius: 5,
          ...style,
        }}
      />
      <View style={{
        position: 'absolute',
        bottom: 10,
        right: 10,
      }}>
        <Text style={{
          fontSize: 17,
          color: colors.textInputPlaceholder,
        }}>{maxLength - value.length}</Text>
      </View>
    </View>
  )
}