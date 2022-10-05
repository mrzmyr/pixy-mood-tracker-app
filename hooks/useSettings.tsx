import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from "react";
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from './useTranslation';

const STORAGE_KEY = 'PIXEL_TRACKER_SETTINGS'
export const COLOR_NAMES = ['slate', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']

export const SCALE_TYPES = [
  'ColorBrew-RdYlGn',
  'ColorBrew-RdYlGn-old',
  'ColorBrew-PiYG',
  'ColorBrew-BrBG',
]

const SettingsStateContext = createContext(undefined)

export type Tag = {
  id: string;
  title: string;
  color: typeof COLOR_NAMES[number];
}

export interface SettingsWebhookEntry {
  url: string,
  date: string,
  body: string,
  statusCode?: number,
  statusText?: string,
  isError: boolean,
  errorMessage?: string,
}

// ATTENTION: If you change the settings state, you need to update
// the export variables also in the DataGate
export interface SettingsState {
  loaded: boolean;
  deviceId: string | null,
  passcodeEnabled: boolean | null,
  passcode: string | null,
  webhookEnabled: Boolean,
  webhookUrl: string,
  webhookHistory: SettingsWebhookEntry[],
  scaleType: typeof SCALE_TYPES[number],
  reminderEnabled: Boolean,
  reminderTime: string,
  trackBehaviour: boolean,
  actionsDone: IAction[],
  tags: Tag[],
}

interface IAction {
  title: string,
  date: string,
}

function SettingsProvider({children}: { children: React.ReactNode }) {
  const { t } = useTranslation()
  
  const initialState: SettingsState = {
    loaded: false,
    deviceId: null,
    passcodeEnabled: null,
    passcode: null,
    webhookEnabled: false,
    webhookUrl: '',
    webhookHistory: [],
    scaleType: 'ColorBrew-RdYlGn',
    reminderEnabled: false,
    reminderTime: '18:00',
    trackBehaviour: true,
    actionsDone: [],
    tags: [{
      id: '1',
      title: `${t('tags_default_1_title')} 🥳`,
      color: 'orange',
    }, {
      id: '2',
      title: `${t('tags_default_2_title')} ☔️`,
      color: 'purple',
    }, {
      id: '3',
      title: `${t('tags_default_3_title')} 💼`,
      color: 'sky',
    }, {
      id: '4',
      title: `${t('tags_default_4_title')} 🏃`,
      color: 'green',
    }, {
      id: '5',
      title: `${t('tags_default_5_title')} 🤗`,
      color: 'yellow',
    }],
  }
  
  const [settings, setSettings] = useState(initialState)

  const setSettingsProxy = async (settingsOrSettingsFunction: SettingsState | Function) => {
    
    const newSettings = typeof settingsOrSettingsFunction === 'function' ? 
      settingsOrSettingsFunction(settings) : 
      settingsOrSettingsFunction;

    setSettings(newSettings)

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
    } catch (e) {
      console.error(e)
    }
  }
  
  const resetSettings = () => {
    console.log('reset settings')
    setSettingsProxy(initialState)
  }

  const importSettings = (settings: SettingsState) => {
    console.log('import settings')
    setSettingsProxy({
      ...initialState,
      ...settings,
    })
  }
  
  useEffect(() => {
    const load = async () => {
      const json = await AsyncStorage.getItem(STORAGE_KEY)
      if (json !== null) {
        const newSettings: SettingsState = {
          ...initialState,
          ...JSON.parse(json)
        }
        if(newSettings.deviceId === null) {
          newSettings.deviceId = uuidv4()
        }
        setSettings({
          ...newSettings,
          loaded: true,
        })
      } else {
        setSettingsProxy({
          ...initialState,
          deviceId: uuidv4(),
          loaded: true,
        })
      }
    }

    try {
      load()
    } catch(e) {
      console.log('Error loading settings', e)
    }
  }, [])

  const value = { 
    settings, 
    setSettings: setSettingsProxy, 
    resetSettings,
    importSettings,
    hasActionDone: (actionTitle: IAction['title']) => {
      return settings.actionsDone.some(action => action.title === actionTitle)
    },
    addActionDone: (actionTitle: IAction['title']) => {
      setSettingsProxy({
        ...settings,
        actionsDone: [...settings.actionsDone, {
          title: actionTitle,
          date: new Date().toISOString(),
        }],
      })
    }
  };
  
  return (
    <SettingsStateContext.Provider value={value}>
      {children}
    </SettingsStateContext.Provider>
  )
}

function useSettings(): { 
  settings: SettingsState, 
  setSettings: (settings: SettingsState | ((settings: SettingsState) => void)) => void, 
  resetSettings: () => void,
  importSettings: (settings: SettingsState) => void,
  addActionDone: (action: IAction['title']) => void,
  hasActionDone: (actionTitle: IAction['title']) => boolean,
} {
  const context = useContext(SettingsStateContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

export { SettingsProvider, useSettings };
