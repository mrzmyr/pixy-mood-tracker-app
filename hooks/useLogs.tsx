import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useReducer } from "react";
import { getJSONSchemaType } from '../lib/utils';
import { Tag as ITag, useSettings } from './useSettings';
import useWebhook from './useWebhook';

const STORAGE_KEY = 'PIXEL_TRACKER_LOGS'
export const RATING_KEYS = ['extremely_good', 'very_good', 'good', 'neutral', 'bad', 'very_bad', 'extremely_bad']

export interface LogItem {
  date: string;
  rating: typeof RATING_KEYS[number];
  message: string;
  tags: ITag[];
}

export interface LogsState {
  items: {
    [id: string]: LogItem;
  };
}

export interface LogAction {
  type: string;
  payload?: LogsState & LogItem;
}

const LogsContext = createContext(undefined)

function reducer(state: LogsState, action: LogAction): LogsState {
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
    case 'batchEdit':
      action.payload.items.forEach((item: LogItem) => {
        state.items[item.date] = {
          ...state.items[item.date],
          ...item
        }
      })
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

function LogsProvider({
  children
}: {
  children: React.ReactNode
}) {
  const webhook = useWebhook()
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
    if(settings.webhookEnabled) {
      webhook.run(action)
    }
  }

  useEffect(() => {
    const load = async () => {
      const data = await AsyncStorage.getItem(STORAGE_KEY)
      const json = JSON.parse(data)
        if (getJSONSchemaType(json) === 'pixy') {
        dispatch({ type: 'import', payload: json })
      } else {
        console.log('PIXY: unkown schema in local storage found')
      }
    }

    try {
      load()
    } catch(e) {
      console.log('loading logs errored', e)
    }
  }, [])
  
  const value = {
    state, 
    dispatch: dispatchProxy,
    createTag: (tag: ITag) => {
      setSettings(settings => ({
        ...settings,
        tags: [...settings.tags, tag]
      }))
    },
    updateTag: (tag: ITag) => {
      const newItems = Object.keys(state.items)
        .map(key => {
          const item = state.items[key];
          const tags = item?.tags?.map(itemTag => {
            if (itemTag.id === tag.id) {
              return tag;
            }
            return itemTag;
          }) || [];
          return {
            ...item,
            tags
          }
        })

      dispatch({
        type: 'batchEdit',
        payload: {
          items: newItems
        }
      })

      setSettings(settings => ({
        ...settings,
        tags: settings.tags.map((itemTag: ITag) => {
          return (itemTag.id === tag.id ? tag : itemTag)
        }
      )}))
    },
    deleteTag: (id: ITag['id']) => {
      setSettings(settings => ({ 
      ...settings, 
        tags: settings.tags.filter((tag: ITag) => tag.id !== id) 
      }))
  
      const newItems = Object.keys(state.items)
        .map(key => {
          const item = state.items[key];
          const tags = item?.tags?.filter(itemTag => itemTag.id !== id) || [];
          return {
            ...item,
            tags
          }
        })
  
      dispatchProxy({
        type: 'batchEdit',
        payload: {
          items: newItems
        }
      })
    }
  };
  
  return (
    <LogsContext.Provider value={value}>
      {children}
    </LogsContext.Provider>
  )
}

function useLogs(): { 
  state: LogsState, 
  dispatch: (action: LogAction) => void
  createTag: (tag: ITag) => void
  updateTag: (tag: ITag) => void
  deleteTag: (id: ITag['id']) => void
} {
  const context = useContext(LogsContext)
  if (context === undefined) {
    throw new Error('useLogs must be used within a LogsProvider')
  }
  return context
}

export { LogsProvider, useLogs };
