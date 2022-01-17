import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = 'PIXEL_TRACKER_SETTINGS'

const SettingsStateContext = createContext(undefined)

export interface SettingsWebhookHistoryEntry {
  url: string,
  date: string,
  body: string,
  statusCode?: number,
  statusText?: string,
  isError: boolean,
  errorMessage?: string,
}

export interface SettingsState {
  webhookEnabled: Boolean,
  webhookUrl: string,
  webhookHistory: SettingsWebhookHistoryEntry[],
}

const initialState: SettingsState = {
  webhookEnabled: false,
  webhookUrl: '',
  webhookHistory: []
}

function SettingsProvider({children}: { children: React.ReactNode }) {
  const [settings, setSettings] = useState(initialState)

  const setSettingsProxy = (settingsOrSettingsFunction: SettingsState | Function) => {
    const newSettings = typeof settingsOrSettingsFunction === 'function' ? settingsOrSettingsFunction(settings) : settingsOrSettingsFunction;
    setSettings(newSettings)
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
  }
  
  const resetSettings = () => {
    console.log('reset settings')
    setSettings(initialState)
  }
  
  useEffect(() => {
    const load = async () => {
      const json = await AsyncStorage.getItem(STORAGE_KEY)
      if (json !== null) setSettings(JSON.parse(json))
    }

    try {
      load()
      // console.log('Loaded settings')
    } catch(e) {
      // console.log('Error loading settings', e)
    }
  }, [])
  
  const value = { settings, setSettings: setSettingsProxy, resetSettings };
  
  return (
    <SettingsStateContext.Provider value={value}>
      {children}
    </SettingsStateContext.Provider>
  )
}

function useSettings(): { settings: SettingsState, setSettings: (settings: SettingsState) => void, resetSettings: () => void } {
  const context = useContext(SettingsStateContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

export { SettingsProvider, useSettings };
