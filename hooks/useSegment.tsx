import * as Segment from 'expo-analytics-segment';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import _ from 'lodash';
import { createContext, useContext, useEffect, useState } from "react";
import { Platform } from 'react-native';
import pkg from '../package.json';
import { useSettings } from './useSettings';

const SegmentContext = createContext(undefined)

interface SegmentState {
  enable: () => void,
  disable: () => void,
  isEnabled: () => Promise<boolean>,
  initialize: () => void,
  track: (event: string, properties?: any) => void,
  screen: (screenName: string, properties?: any) => void,
  identify: (properties?: {}) => void
}

function SegmentProvider({
  children
}: {
  children: React.ReactNode
}) {
  const { settings } = useSettings()

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
      settingsTags: settings.tags.map(tag => ({
        ...(_.omit(tag, 'title')),
        tagLength: tag.title.length,
      })),
      ...properties,
    }

    if(__DEV__ || Platform.OS === 'web') {
      console.log('useSegment: identify', traits)
      return;
    }

    if(settings.deviceId === null) {
      console.warn('useSegment: deviceId is null, cannot identify')
      return;
    }
    
    Segment.identifyWithTraits(settings.deviceId, traits)
    setIsIdentified(true)
  }
  
  const value: SegmentState = {
    enable: () => {
      if(Platform.OS === 'web') return;
      Segment.setEnabledAsync(true)
    },
    disable: () => {
      if(Platform.OS === 'web') return;
      Segment.setEnabledAsync(false)
    },
    isEnabled: async () => {
      if(Platform.OS === 'web') return true;
      return await Segment.getEnabledAsync()
    },
    initialize: async () => {
      if(__DEV__ || Platform.OS === 'web') {
        console.log('useSegment: initialize')
        return;
      }
      Segment.initialize({
        iosWriteKey: "Yo8UcPWNys6eIpRYVtWAvZ3enRxS8ALQ",
        androidWriteKey: "Yo8UcPWNys6eIpRYVtWAvZ3enRxS8ALQ",
      })
    },
    track: (eventName: string, properties?: any) => {
      if(__DEV__ || Platform.OS === 'web') {
        console.log('useSegment: track', eventName, properties)
        return;
      }

      Segment.trackWithProperties(eventName, {
        ...properties,
        userId: settings.deviceId
      })
    },
    screen: (screenName: string, properties?: any) => {
      if(__DEV__ || Platform.OS === 'web') {
        console.log('useSegment: screen', screenName, properties)
        return;
      }

      Segment.screenWithProperties(screenName, {
        userId: settings.deviceId,
        ...properties,
      })
    },
    identify
  }

  useEffect(() => {
    if(!isIdentified && settings.deviceId !== null) {
      identify()
    }
  }, [settings.deviceId])
  
  return (
    <SegmentContext.Provider value={value}>
      {children}
    </SegmentContext.Provider>
  )
}


function useSegment(): SegmentState {
  const context = useContext(SegmentContext)
  if (context === undefined) {
    throw new Error('useSegment must be used within a SegmentProvider')
  }
  return context
}

export { SegmentProvider, useSegment };
