import * as Application from 'expo-application';
import * as Localization from 'expo-localization';
import { Alert, Platform } from 'react-native';
import { useTranslation } from './useTranslation';

export type FeedackType = 'issue' | 'idea' | 'other' | 'emoji';
export type FeedbackSource = 'tags' | 'modal' | 'statistics';

const send = ({
  type,
  message,
  email,
  source,
  onOk = () => {},
  onCancel = () => {},
}: {
  type: FeedackType;
  source: FeedbackSource;
  email?: string;
  message: string;
  onOk?: () => void;
  onCancel?: () => void;
}) => {
  const { t } = useTranslation()
  
  const metaData = {
    locale: Localization.locale,
    version: Application.nativeBuildVersion,
    os: Platform.OS,
    date: new Date().toISOString(),
    source,
  }

  const url = 'https://eocfnkx0gbrjzvp.m.pipedream.net'

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...metaData,
      type,
      message,
      email,
    }),
  }).then(resp => {
    if(resp.ok) {
      if(onOk) {
        onOk()
      } else {
        Alert.alert(
          t('feedback_success_title'),
          t('feedback_success_message'),
          [
            { text: t('ok'), onPress: () => onOk() }
          ],
          { cancelable: false }
        )
      }
    } else {
      if(onCancel) {
        onCancel()
      } else {
        Alert.alert(
          t('feedback_error_title'),
          t('feedback_error_message'),
          [
            { text: t('ok'), onPress: () => onCancel() }
          ],
          { cancelable: false }
        )
      }
    }
  }).catch(() => {
    if(onCancel) {
      onCancel()
    } else {
      Alert.alert(
        t('feedback_error_title'),
        t('feedback_error_message'),
        [
          { text: t('ok'), onPress: () => onCancel() }
        ],
        { cancelable: false }
      )
    }
  })
}

export const useFeedback = () => {
  return {
    send,
  }
}