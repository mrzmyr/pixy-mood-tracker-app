import { useNavigation } from '@react-navigation/native';
import { t } from 'i18n-js';
import { Pressable, Text, View } from 'react-native';
import useColors from '../../../hooks/useColors';
import useHaptics from '../../../hooks/useHaptics';
import { LogItem } from '../../../hooks/useLogs';
import { Headline } from './Headline';

export const Message = ({
  item,
}: {
  item: LogItem;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const navigation = useNavigation();

  return (
    <View
      style={{
        marginTop: 24,
      }}
    >
      <Headline>{t('view_log_message')}</Headline>
      <View
        style={{
          flexDirection: 'row',
        }}
      >
        {item?.message?.length > 0 ? (
          <Pressable
            onPress={async () => {
              await haptics.selection();
              navigation.navigate('LogEdit', { id: item.id, step: 'message' });
            }}
            style={{
              width: '100%',
            }}
          >
            <View
              style={{
                backgroundColor: colors.logCardBackground,
                borderRadius: 8,
                padding: 16,
                width: '100%',
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  color: colors.text,
                  lineHeight: 23,
                  width: '100%',
                }}
              >{item.message}</Text>
            </View>
          </Pressable>
        ) : (
          <View
            style={{
              padding: 8,
              width: '100%',
            }}
          >
            <Text style={{
              color: colors.textSecondary,
              fontSize: 17,
              lineHeight: 24,
            }}>{t('view_log_message_empty')}</Text>
          </View>
        )}
      </View>
    </View>
  );
};
