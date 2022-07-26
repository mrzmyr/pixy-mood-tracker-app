import { Text, TextInput, View } from 'react-native';
import useColors from '../../hooks/useColors';
import { useTranslation } from '../../hooks/useTranslation';

export const TitleInput = ({
  value, onChange, onSubmit,
}) => {
  const colors = useColors();
  const { t } = useTranslation()

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: 17,
          marginRight: 16,
          flex: 2,
        }}
      >{t('title')}</Text>
      <View
        style={{
          flex: 10,
          flexDirection: 'row',
        }}
      >
        <TextInput
          autoCorrect={false}
          style={{
            fontSize: 17,
            color: colors.textInputText,
            width: '100%',
            height: '100%',
          }}
          placeholder={t('tags_add_placeholder')}
          placeholderTextColor={colors.textInputPlaceholder}
          maxLength={30}
          value={value}
          onChangeText={text => {
            onChange(text);
          }}
          onSubmitEditing={() => {
            onSubmit(value);
          }} />
      </View>
    </View>
  );
};
