import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import { usePostHog } from 'posthog-react-native';
import { createContext, useContext, useEffect, useState } from "react";
import pkg from '../package.json';
import { useAnonymizer } from './useAnonymizer';
import { useSettings } from './useSettings';

const AnalyticsContext = createContext(undefined)

interface AnaylticsState {
  enable: () => void,
  disable: () => void,
  reset: () => void,
  isEnabled: boolean,
  track: (event: string, properties?: any) => void,
  identify: (properties?: {}) => void
}

export const TRACKING_ENABLED = !__DEV__;
const DEBUG = true

function AnalyticsProvider({
  children
}: {
  children: React.ReactNode
}) {
  const { settings, setSettings } = useSettings()
  const posthog = usePostHog()

  const { anonymizeTag } = useAnonymizer()
  
  const [isIdentified, setIsIdentified] = useState(false)
  const [isEnabled, setIsEnabled] = useState(TRACKING_ENABLED)

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
      setIsEnabled(posthog.optedOut === false)
      setSettings((settings) => ({
        ...settings,
        analyticsEnabled: true
      }))
    },
    disable: () => {
      posthog.optOut()
      setIsEnabled(posthog.optedOut === false)
      setSettings((settings) => ({
        ...settings,
        analyticsEnabled: false
      }))
    },
    reset: () => {
      if(DEBUG) console.log('useAnalytics: reset')
      posthog.reset()
      setIsEnabled(posthog.optedOut === false)
    },
    track: (eventName: string, properties?: any) => {
      if(DEBUG) console.log('useAnalytics: track', eventName, properties)

      if(!TRACKING_ENABLED) return;

      posthog.capture(eventName, {
        ...properties,
        userId: settings.deviceId
      })
    },
    isEnabled
  }

  useEffect(() => {
    if(!isIdentified && settings.deviceId !== null) {
      identify()
    }
  }, [settings.deviceId])
  
  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
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
