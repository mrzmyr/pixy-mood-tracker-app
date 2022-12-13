import Button from '@/components/Button';
import { locale, t } from '@/helpers/translation';
import useColors from "@/hooks/useColors";
import useFeedbackModal from '@/hooks/useFeedbackModal';
import useHaptics from "@/hooks/useHaptics";
import { useTemporaryLog } from '@/hooks/useTemporaryLog';
import { getItemDateTitle } from '@/lib/utils';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { ArrowLeft, Trash, X } from 'react-native-feather';
import DateTimePickerModal from "react-native-modal-datetime-picker";

const DatePickerHeader = ({
  onChange,
}: {
  onChange: (date: Date) => void,
}) => {
  const colors = useColors()
  const tempLog = useTemporaryLog();

  return (
    <View style={{
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 16,
    }}
    >
      <Button
        type='tertiary'
        onPress={() => {
          onChange(dayjs(tempLog.data.dateTime).hour(8).minute(0).toDate())
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
          onChange(dayjs(tempLog.data.dateTime).hour(13).minute(0).toDate())
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
          onChange(dayjs(tempLog.data.dateTime).hour(20).minute(0).toDate())
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
  )
}

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
  const { Modal, show } = useFeedbackModal()
  const haptics = useHaptics();
  const colors = useColors()
  const tempLog = useTemporaryLog();

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const dateTime = tempLog.data.dateTime ? new Date(tempLog.data.dateTime) : new Date()
  const dateTimeTitle = tempLog.data.dateTime !== null ? getItemDateTitle(tempLog.data.dateTime) : '?'

  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: -8,
      width: '100%',
    }}
    >
      {Platform.OS !== 'web' && (
        <DateTimePickerModal
          customHeaderIOS={() => (
            <DatePickerHeader
              onChange={date => {
                setDatePickerVisibility(false)
                tempLog.update({
                  dateTime: dayjs(date).toISOString(),
                })
              }}
            />
          )}
          isVisible={isDatePickerVisible}
          locale={locale}
          date={dateTime}
          mode="datetime"
          minuteInterval={10}
          onConfirm={date => {
            setDatePickerVisibility(false)
            tempLog.update({
              dateTime: dayjs(date).toISOString(),
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
        <Modal />
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
