import * as Application from 'expo-application';
import * as Localization from 'expo-localization';
import { Alert, Platform } from 'react-native';
import { useTranslation } from './useTranslation';

export type FeedackType = 'issue' | 'idea' | 'other' | 'emoji';
export type FeedbackSource = 'tags' | 'modal';

const send = ({
  type,
  message,
  source,
  onOk = () => {},
  onCancel = () => {},
}: {
  type: FeedackType;
  source: FeedbackSource;
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

  const url = 'https://f7e52509fce26bc860d05c9cffff8d87.m.pipedream.net'

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...metaData,
      type,
      message
    }),
  }).then(resp => {
    if(resp.ok) {
      Alert.alert(
        t('feedback_success_title'),
        t('feedback_success_message'),
        [
          { text: t('ok'), onPress: () => onOk() }
        ],
        { cancelable: false }
      )
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
  }).catch(() => {
    Alert.alert(
      t('feedback_error_title'),
      t('feedback_error_message'),
      [
        { text: t('ok'), onPress: () => onCancel() }
      ],
      { cancelable: false }
    )
  })
}

export const useFeedback = () => {
  return {
    send,
  }
}