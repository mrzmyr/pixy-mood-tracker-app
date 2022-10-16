import AsyncStorage from '@react-native-async-storage/async-storage';
import _ from 'lodash';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import { TAG_COLOR_NAMES } from '../constants/Config';
import { useAnalytics } from './useAnalytics';
import { LogItem, useLogState, useLogUpdater } from './useLogs';
import { useSettings } from './useSettings';
import { useTranslation } from './useTranslation';

export const STORAGE_KEY = 'PIXEL_TRACKER_TAGS'

export type Tag = {
  id: string;
  title: string;
  color: typeof TAG_COLOR_NAMES[number];
};

interface State {
  loaded?: boolean
  tags: Tag[]
}

type StateAction = 
  | { type: 'add', payload: Tag }
  | { type: 'edit', payload: Tag }
  | { type: 'delete', payload: Tag['id'] }
  | { type: 'import', payload: State }
  | { type: 'reset', payload: State }

interface StateValue extends State {
}

interface UpdaterValue {
  createTag: (tag: Tag) => void
  updateTag: (tag: Tag) => void
  deleteTag: (tagId: Tag['id']) => void
  reset: () => void
  import: (data: State) => void
}

const TagsStateContext = createContext(undefined)
const TagsUpdaterContext = createContext(undefined)

async function store(state: Omit<State, 'loaded'>) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error(e);
  }
}

const load = async (): Promise<State | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY)

    if(data !== null) {
      const json = JSON.parse(data)
      return {
        ...json,
        loaded: true
      }
    }
  } catch (e) {
    console.error(e);
  }

  return null;
}

const reducer = (state: State, action: StateAction): State => {
  switch (action.type) {
    case 'import':
      return {
        ...action.payload,
        loaded: true
      };
    case 'add':
      state.tags.push(action.payload);
      return { ...state }
    case 'edit':
      const index = state.tags.findIndex(tag => tag.id === action.payload.id);
      state.tags[index] = action.payload;
      return { ...state }
    case 'delete':
      state.tags = state.tags.filter(tag => tag.id !== action.payload);
      return { ...state }
    case 'reset':
      return {
        ...action.payload,
        loaded: true
      }
  }
}

function TagsProvider({
  children
}: {
  children: React.ReactNode
}) {
  const { t } = useTranslation();
  const { settings } = useSettings()
  const logsUpdater = useLogUpdater()
  const logsState = useLogState()
  
  const INITIAL_STATE: State = {
    loaded: false,
    tags: [
      {
        id: "1",
        title: `${t("tags_default_1_title")} 🥳`,
        color: "orange",
      },
      {
        id: "2",
        title: `${t("tags_default_2_title")} ☔️`,
        color: "purple",
      },
      {
        id: "3",
        title: `${t("tags_default_3_title")} 💼`,
        color: "sky",
      },
      {
        id: "4",
        title: `${t("tags_default_4_title")} 🏃`,
        color: "green",
      },
      {
        id: "5",
        title: `${t("tags_default_5_title")} 🤗`,
        color: "yellow",
      },
    ]
  }
  
  const analytics = useAnalytics()
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  
  const stateValue: StateValue = useMemo(() => state, [JSON.stringify(state)])
  
  const createTag = useCallback((tag: Tag) => dispatch({ type: 'add', payload: tag }), [dispatch])

  const updateTag = useCallback((tag: Tag) => {
    dispatch({ type: 'edit', payload: tag })

    const newItems = {};
    
    Object.entries(logsState.items)
      .forEach(([date, item]: [string, LogItem]) => {
        if(item?.tags?.some(t => t.id === tag.id)) {
          const tags = item.tags.map(t => t.id === tag.id ? tag : t)
          item.tags = tags
        }
        newItems[date] = item;
      })

    logsUpdater.updateLogs(newItems)
  }, [dispatch, logsState.items, logsUpdater])

  const deleteTag = useCallback((tagId: Tag['id']) => {
    dispatch({ type: 'delete', payload: tagId })

    const newItems = {};

    Object.entries(logsState.items)
      .forEach(([date, item]: [string, LogItem]) => {
        if(logsState.items[date]?.tags?.some((tag: Tag) => tag.id === tagId)) {
          const tags = item?.tags?.filter(itemTag => itemTag.id !== tagId) || [];
          item.tags = tags;
        }
        newItems[date] = item;
      })

    logsUpdater.updateLogs(newItems);
  }, [dispatch, logsUpdater, JSON.stringify(logsState.items)])
  
  const reset = useCallback(() => dispatch({ type: 'reset', payload: INITIAL_STATE }), [dispatch])
  const importData = useCallback((data: State) => dispatch({ type: 'import', payload: data }), [dispatch])
  
  const updaterValue: UpdaterValue = useMemo(() => ({
    createTag,
    updateTag,
    deleteTag,
    reset,
    import: importData
  }), [createTag, updateTag, deleteTag, reset, importData])

  useEffect(() => {
    if(!settings.loaded) return;
    
    (async () => {
      const json = await load()
      if(json !== null) {
        analytics.track('tags_loaded', { source: 'tags_async_storage' })
        dispatch({ type: 'import', payload: json })
      } else if(settings?.tags) {
        analytics.track('tags_loaded', { source: 'settings_async_storage' })
        dispatch({
          type: 'import', 
          payload: {
            tags: settings.tags
          }
        })
      } else {
        analytics.track('tags_loaded', { source: 'initial' })
        dispatch({ type: 'reset', payload: INITIAL_STATE })     
      }
    })();
  }, [settings.loaded])

  useEffect(() => {
    if(state.loaded) {
      store(_.omit(state, 'loaded'))
    }
  }, [JSON.stringify(state)])
  
  return (
    <TagsStateContext.Provider value={stateValue}>
      <TagsUpdaterContext.Provider value={updaterValue}>
      {children}
      </TagsUpdaterContext.Provider>
    </TagsStateContext.Provider>
  )
}

function useTagsState(): StateValue {
  const context = useContext(TagsStateContext)
  if (context === undefined) {
    throw new Error('useTagsState must be used within a TagsProvider')
  }
  return context
}

function useTagsUpdater(): UpdaterValue {
  const context = useContext(TagsUpdaterContext)
  if (context === undefined) {
    throw new Error('useTagsUpdater must be used within a TagsProvider')
  }
  return context
}

export {
  TagsProvider,
  useTagsState,
  useTagsUpdater
};

