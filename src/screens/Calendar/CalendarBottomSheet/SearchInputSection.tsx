import { Pressable, TextInput, View } from 'react-native';
import useColors from '../../../hooks/useColors';
import { Search, XCircle } from 'react-native-feather';
import { t } from '@/helpers/translation';

export const SearchInputSection = ({
  value, onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        marginBottom: 16,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.textInputBorder,
          backgroundColor: colors.textInputBackground,
          borderRadius: 8,
          padding: 8,
        }}
      >
        <View
          style={{
            marginLeft: 4,
          }}
        >
          <Search color={colors.textInputPlaceholder} width={20} />
        </View>
        <TextInput
          placeholder={t('calendar_filters_search')}
          value={value}
          placeholderTextColor={colors.textInputPlaceholder}
          style={{
            flex: 1,
            color: colors.textInputText,
            marginLeft: 12,
            fontSize: 17,
            width: '100%',
            borderRadius: 8,
          }}
          onChangeText={onChange} />
        {value !== '' && (
          <Pressable
            style={{
              paddingRight: 8,
              padding: 8,
              margin: -8,
            }}
            onPress={() => onChange('')}
          >
            <XCircle color={colors.textInputPlaceholder} width={20} />
          </Pressable>
        )}
      </View>
    </View>
  );
};
