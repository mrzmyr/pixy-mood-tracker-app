import * as Localization from 'expo-localization';
import { Alert, Platform } from 'react-native';
import { FEEDBACK_URL } from '@/constants/API';
import { t } from '@/helpers/translation';
import pkg from '../../package.json';
import { useAnalytics } from './useAnalytics';
import { useSettings } from './useSettings';
import * as Updates from 'expo-updates';

export type FeedackType = 'issue' | 'idea' | 'other' | 'emoji';
export type FeedbackSource = 'tags' | 'modal' | 'statistics';

export const useFeedback = () => {
  const { settings } = useSettings();
  const analytics = useAnalytics()

  const send = async ({
    type,
    message,
    email,
    source,
    onOk,
    onCancel,
  }: {
    type: FeedackType;
    source: FeedbackSource;
    email?: string;
    message: string;
    onOk?: () => void;
    onCancel?: () => void;
  }) => {
    const metaData = {
      locale: Localization.locale,
      version: pkg.version,
      os: Platform.OS,
      date: new Date().toISOString(),
      source,
      deviceId: settings.deviceId,
      environment: Updates.channel,
    }

    const body = {
      ...metaData,
      type,
      message,
      email,
    }

    analytics.track('feedback_send', body)

    return fetch(FEEDBACK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }).then(resp => {
      if (resp.ok) {
        if (onOk) {
          onOk()
        } else {
          Alert.alert(
            t('feedback_success_title'),
            t('feedback_success_message'),
            [
              { text: t('ok') }
            ],
            { cancelable: false }
          )
        }
      } else {
        if (onCancel) {
          onCancel()
        } else {
          Alert.alert(
            t('feedback_error_title'),
            t('feedback_error_message'),
            [
              { text: t('ok') }
            ],
            { cancelable: false }
          )
        }
      }
    }).catch(() => {
      if (onCancel) {
        onCancel()
      } else {
        Alert.alert(
          t('feedback_error_title'),
          t('feedback_error_message'),
          [
            { text: t('ok') }
          ],
          { cancelable: false }
        )
      }
    })
  }

  return {
    send,
  }
}