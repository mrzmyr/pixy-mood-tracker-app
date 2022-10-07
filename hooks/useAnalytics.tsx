import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import _ from 'lodash';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { createContext, useContext, useEffect, useState } from "react";
import { POSTHOG_API_KEY } from '../constants/API';
import pkg from '../package.json';
import { useAnonymizer } from './useAnonymizer';
import { useSettings } from './useSettings';

const AnalyticsContext = createContext(undefined)

interface AnaylticsState {
  enable: () => void,
  disable: () => void,
  reset: () => void,
  isEnabled: () => boolean,
  track: (event: string, properties?: any) => void,
  identify: (properties?: {}) => void
}

export const TRACKING_ENABLED = !__DEV__;
const DEBUG = false

function AnalyticsProvider({
  children
}: {
  children: React.ReactNode
}) {
  const { settings } = useSettings()
  const posthog = usePostHog()

  const { anonymizeTag } = useAnonymizer()
  
  const [isIdentified, setIsIdentified] = useState(false)

  const identify = (properties?: any) => {
    const traits = {
      userId: settings.deviceId,
      appVersion: pkg.version,
      deviceModel: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      locale: Localization.locale,

      settingsPasscodeEnabled: settings.passcodeEnabled,
      settingsReminderEnabled: settings.reminderEnabled,
      settingsReminderTime: settings.reminderTime,
      settingsScaleType: settings.scaleType,
      settingsWebhookEnabled: settings.webhookEnabled,
      settingsActionsDone: settings.actionsDone,
      settingsTags: settings.tags.map(tag => anonymizeTag(tag)),
      ...properties,
    }

    
    if(DEBUG) console.log('useAnalytics: identify', traits)

    if(!TRACKING_ENABLED) return;

    if(settings.deviceId === null) {
      console.warn('useAnalytics: deviceId is null, cannot identify')
      return;
    }
    
    posthog.identify(settings.deviceId, traits)
    setIsIdentified(true)
  }
  
  const value: AnaylticsState = {
    identify,
    enable: () => {
      posthog.optIn()
    },
    disable: () => {
      posthog.optOut()
    },
    reset: () => {
      if(DEBUG) console.log('useAnalytics: reset')
      posthog.reset()
      console.log(posthog.optedOut)
    },
    track: (eventName: string, properties?: any) => {
      if(DEBUG) console.log('useAnalytics: track', eventName, properties)

      if(!TRACKING_ENABLED) return;

      posthog.capture(eventName, {
        ...properties,
        userId: settings.deviceId
      })
    },
    isEnabled: () => posthog.optedOut === false,
  }

  useEffect(() => {
    if(!isIdentified && settings.deviceId !== null) {
      identify()
    }
  }, [settings.deviceId])
  
  return (
    <PostHogProvider 
      apiKey={POSTHOG_API_KEY} 
      options={{
        host: 'https://app.posthog.com',
      }}
    >
      <AnalyticsContext.Provider value={value}>
        {children}
      </AnalyticsContext.Provider>
    </PostHogProvider>
  )
}


function useAnalytics(): AnaylticsState {
  const context = useContext(AnalyticsContext)
  if (context === undefined) {
    throw new Error('useAnalytics must be used within a AnalyticsProvider')
  }
  return context
}

export { AnalyticsProvider, useAnalytics };
