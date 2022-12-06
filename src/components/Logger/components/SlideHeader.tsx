import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Dimensions, Platform, Pressable, Text, View } from 'react-native';
import { ArrowLeft, Clock, Trash, X } from 'react-native-feather';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { DATE_FORMAT } from '@/constants/Config';
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { useTemporaryLog } from '@/hooks/useTemporaryLog';
import { getItemDateTitle } from '@/lib/utils';
import { locale, t } from '@/helpers/translation';
import Button from '@/components/Button';

const SCREEN_WIDTH = Dimensions.get('window').width;

export const SlideHeader = ({
  isDeleteable,
  backVisible,
  onBack,
  onClose,
  onDelete,
}: {
  isDeleteable: boolean;
  backVisible?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  onDelete?: () => void;
}) => {
  const haptics = useHaptics();
  const colors = useColors()
  const tempLog = useTemporaryLog();
  const navigation = useNavigation()

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const dateTime = tempLog.data.dateTime ? new Date(tempLog.data.dateTime) : new Date()
  const dateTimeTitle = tempLog.data.dateTime !== null ? getItemDateTitle(tempLog.data.dateTime) : '?'

  return (
    <View style={{
      flexDirection: SCREEN_WIDTH < 350 ? 'column' : 'row',
      justifyContent: 'space-between',
      marginTop: -8,
      width: '100%',
    }}
    >
      {Platform.OS !== 'web' && (
        <DateTimePickerModal
          customHeaderIOS={() => (
            <View style={{
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: 16,
            }}
            >
              <Button
                type='tertiary'
                onPress={() => {
                  tempLog.set(tempLog => ({
                    ...tempLog,
                    dateTime: dayjs(tempLog.dateTime).hour(8).minute(0).toISOString()
                  }))
                  setDatePickerVisibility(false)
                }}
                style={{
                  width: '100%',
                  padding: 12,
                  maxWidth: 240,
                  marginBottom: 8,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 17, color: colors.tertiaryButtonText }}>{t('morning')}</Text>
              </Button>
              <Button
                type='tertiary'
                onPress={() => {
                  tempLog.set(tempLog => ({
                    ...tempLog,
                    dateTime: dayjs(tempLog.dateTime).hour(13).minute(0).toISOString()
                  }))
                  setDatePickerVisibility(false)
                }}
                style={{
                  width: '100%',
                  maxWidth: 240,
                  padding: 12,
                  marginBottom: 8,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 17, color: colors.tertiaryButtonText }}>{t('afternoon')}</Text>
              </Button>
              <Button
                type='tertiary'
                onPress={() => {
                  tempLog.set(tempLog => ({
                    ...tempLog,
                    dateTime: dayjs(tempLog.dateTime).hour(20).minute(0).toISOString()
                  }))
                  setDatePickerVisibility(false)
                }}
                style={{
                  width: '100%',
                  maxWidth: 240,
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 17, color: colors.tertiaryButtonText }}>{t('evening')}</Text>
              </Button>
            </View>
          )}
          isVisible={isDatePickerVisible}
          locale={locale}
          date={dateTime}
          mode="datetime"
          minuteInterval={10}
          onConfirm={date => {
            setDatePickerVisibility(false)
            tempLog.set(log => ({
              ...log,
              date: dayjs(date).format(DATE_FORMAT),
              dateTime: dayjs(date).toISOString(),
            }))
            navigation.setParams({
              date: dayjs(date).format(DATE_FORMAT),
            })
          }}
          onCancel={() => setDatePickerVisibility(false)}
        />
      )}
      <View
        style={{
          alignItems: 'flex-start',
          justifyContent: 'center',
          flex: 1,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
          }}
        >
          {backVisible ? (
            <Pressable
              onPress={() => {
                haptics.selection();
                onBack?.()
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                height: 42,
                width: 42,
              })}
            >
              <ArrowLeft color={colors.logHeaderText} width={24} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                haptics.selection();
                setDatePickerVisibility(true)
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: colors.logHeaderHighlight,
                borderRadius: 8,
              })}
            >
              <Clock color={colors.logHeaderText} width={17} style={{ marginRight: 8 }} />
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 17,
                  fontWeight: '600',
                  color: colors.logHeaderText,
                }}
              >{dateTimeTitle}</Text>
            </Pressable>
          )}
        </View>
      </View>
      <View
        style={{
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
          }}
        >
          {isDeleteable && (
            <Pressable
              style={{
                height: 42,
                width: 42,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={async () => {
                await haptics.selection()
                onDelete?.()
              }}
            >
              <Trash color={colors.logHeaderText} width={24} height={24} />
            </Pressable>
          )}
          <Pressable
            style={{
              height: 42,
              width: 42,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={async () => {
              await haptics.selection()
              onClose?.()
            }}
          >
            <X color={colors.logHeaderText} width={24} height={24} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};
