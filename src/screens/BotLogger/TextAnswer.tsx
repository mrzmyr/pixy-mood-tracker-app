import { MiniButton } from "@/components/MiniButton";
import { t } from "@/helpers/translation";
import useColors from "@/hooks/useColors";
import { useState } from "react";
import { TextInput, View } from "react-native";

export const TextAnswer = ({
  onPress
}: {
  onPress: (text: string) => void;
}) => {
  const colors = useColors();
  const [text, setText] = useState('');

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        width: '100%',
        borderTopColor: colors.cardBorder,
        borderTopWidth: 1,
        paddingTop: 16,
        paddingHorizontal: 16,
      }}
    >
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: colors.textInputBorder,
          backgroundColor: colors.textInputBackground,
          color: colors.textInputText,
          paddingTop: 12,
          padding: 12,
          fontSize: 17,
          borderRadius: 12,
          flex: 1,
          marginRight: 8,
          maxHeight: 200,
        }}
        autoFocus
        placeholderTextColor={colors.textInputPlaceholder}
        multiline
        onChangeText={text => setText(text)}
        value={text}
        placeholder={t('bot_input_placeholder')}
        onSubmitEditing={() => {
          onPress(text);
          setText('');
        }} />
      <MiniButton
        onPress={() => {
          onPress(text);
          setText('');
        }}
        style={{
          borderRadius: 12,
          marginRight: 0,
          marginBottom: 0,
          minHeight: 46,
        }}
      >
        {t('bot_send')}
      </MiniButton>
    </View>
  );
};
