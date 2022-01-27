import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useReducer } from "react";
import { getJSONSchemaType } from '../lib/utils';
import { useSettings } from './useSettings';

const STORAGE_KEY = 'PIXEL_TRACKER_LOGS'

type LogsProviderProps = {children: React.ReactNode}

export interface LogItem {
  date: string;
  rating: 'extremely_good' | 'very_good' | 'good' | 'neutral' | 'bad' | 'very_bad' | 'extremely_bad';
  message: string;
}

export interface LogsState {
  items: {
    [id: string]: LogItem;
  };
}

interface LogAction {
  type: string;
  payload?: LogsState | LogItem;
}

const LogsContext = createContext(undefined)

function reducer(state: LogsState, action: LogAction) {
  switch (action.type) {
    case 'import':
      return { ...action.payload };
    case 'add':
      state.items[action.payload.date] = action.payload;
      return { ...state }
    case 'edit':
      state.items[action.payload.date] = {
        ...state.items[action.payload.date],
        ...action.payload
      }
      return { ...state }
    case 'delete':
      delete state.items[action.payload.date]
      return { ...state }
    case 'reset':
      return { items: {} }
    default:
      throw new Error(`Unhandled action type: ${action.type}`)
  }
}

async function saveLogs(state: LogsState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function LogsProvider({children}: LogsProviderProps) {
  const { settings, setSettings } = useSettings()
  
  const reducerProxy = (state: LogsState, action: LogAction): LogsState => {
    const newState = reducer(state, action)
    if(['add', 'edit', 'delete', 'import'].includes(action.type)) {
      saveLogs(newState)
    }
    return newState
  }
  
  const [state, dispatch] = useReducer(reducerProxy, {
    items: {}
  })

  const dispatchProxy = (action: LogAction) => {
    dispatch(action)

    if (
      settings.webhookEnabled &&
      ['add', 'edit', 'delete'].includes(action.type)
    ) {
      const url = settings.webhookUrl
      const body = JSON.stringify(action)

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      }).then(resp => {
        setSettings({ ...settings, 
          webhookHistory: [{
            date: new Date().toISOString(),
            url,
            body,
            statusCode: resp.status,
            statusText: resp.status === 200 ? 'OK' : resp.statusText,
            isError: false,
          }, ...settings.webhookHistory.slice(0, 20)]
        })
      }).catch(error => {
        setSettings({ ...settings, 
          webhookHistory: [{
            date: new Date().toISOString(),
            url,
            body,
            isError: true,
            errorMessage: error.message,
          }, ...settings.webhookHistory.slice(0, 20)]
        })
      })
    }
  }

  useEffect(() => {
    const load = async () => {
      const data = await AsyncStorage.getItem(STORAGE_KEY)
      const json = JSON.parse(data)
        if (getJSONSchemaType(json) === 'pixy') {
        dispatch({ type: 'import', payload: json })
      } else {
        console.error('PIXY: unkown schema in local storage found')
      }
    }

    try {
      load()
      // console.log('loading successful')
    } catch(e) {
      // console.log('loading errored', e)
    }
  }, [])
  
  const value = {
    state, 
    dispatch: dispatchProxy
  };
  
  return (
    <LogsContext.Provider value={value}>
      {children}
    </LogsContext.Provider>
  )
}

function useLogs(): { state: LogsState, dispatch: (action: LogAction) => void } {
  const context = useContext(LogsContext)
  if (context === undefined) {
    throw new Error('useLogs must be used within a LogsProvider')
  }
  return context
}

export { LogsProvider, useLogs };
