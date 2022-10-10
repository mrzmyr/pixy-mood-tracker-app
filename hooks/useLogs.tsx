import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import _ from 'lodash';
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
      state.items = action.payload.items
      return state
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
    getItemsCoverage() {
      let itemsCoverage = 0;
    
      const itemsSorted = Object.keys(state.items).sort((a, b) => {
        return new Date(state.items[a].date).getTime() - new Date(state.items[b].date).getTime()
      })
    
      if(itemsSorted.length > 0) {
        const firstItemDate = new Date(itemsSorted[0])
        const days = dayjs().diff(firstItemDate, 'day')
        itemsCoverage = Math.round((itemsSorted.length / days) * 100)
      }
    
      return itemsCoverage
    },
    updateTag: (tag: ITag) => {
      const newItems = {};
      
      Object.entries(state.items)
        .forEach(([date, item]: [string, LogItem]) => {
          if(item?.tags?.some(t => t.id === tag.id)) {
            const tags = item.tags.map(t => t.id === tag.id ? tag : t)
            item.tags = tags
          }
          newItems[date] = item;
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

      const newItems = {};
  
      Object.entries(state.items)
        .forEach(([date, item]: [string, LogItem]) => {
          if(state.items[date]?.tags?.some((tag: ITag) => tag.id === id)) {
            const tags = item?.tags?.filter(itemTag => itemTag.id !== id) || [];
            item.tags = tags;
          }
          newItems[date] = item;
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
  getItemsCoverage: () => number
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
