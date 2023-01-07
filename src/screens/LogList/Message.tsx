import useColors from '@/hooks/useColors';
import { LogItem } from '@/hooks/useLogs';
import { t } from 'i18n-js';
import { Text, View } from 'react-native';
import { Headline } from './Headline';

export const Message = ({
  item,
}: {
  item: LogItem;
}) => {
  const colors = useColors();

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
          <View
            style={{
              width: '100%',
            }}
          >
            <View
              style={{
                borderRadius: 8,
                paddingHorizontal: 8,
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
          </View>
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
