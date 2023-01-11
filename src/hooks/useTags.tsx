import { TAG_COLOR_NAMES } from '@/constants/Config';
import { load, store } from '@/helpers/storage';
import { t } from '@/helpers/translation';
import _ from 'lodash';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import { useAnalytics } from './useAnalytics';
import { useLogState, useLogUpdater } from './useLogs';
import { useSettings } from './useSettings';

export const STORAGE_KEY = 'PIXEL_TRACKER_TAGS'

export type Tag = {
  id: string;
  title: string;
  color: typeof TAG_COLOR_NAMES[number];
  isArchived?: boolean;
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

const TagsStateContext = createContext({} as StateValue)
const TagsUpdaterContext = createContext({} as UpdaterValue)

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

const _generateTag = (id: number, title: string, color: Tag['color']): Tag => ({
  id: `${id}`,
  title,
  color
})

function TagsProvider({
  children
}: {
  children: React.ReactNode
}) {
  const { settings } = useSettings()
  const logsUpdater = useLogUpdater()
  const logsState = useLogState()

  const INITIAL_STATE: State = {
    loaded: false,
    tags: [
      _generateTag(1, `${t('tags_default_1_title')} 🏡`, 'slate'),
      _generateTag(2, `${t('tags_default_2_title')} 🤝`, 'orange'),
      _generateTag(3, `${t('tags_default_3_title')} ❤️`, 'red'),
      _generateTag(4, `${t('tags_default_4_title')} 🏃‍♂️`, 'blue'),
      _generateTag(5, `${t('tags_default_5_title')} 🛀`, 'teal'),
      _generateTag(6, `${t('tags_default_6_title')} 📚`, 'purple'),
      _generateTag(7, `${t('tags_default_7_title')} 🧹`, 'indigo'),
      _generateTag(8, `${t('tags_default_8_title')} 🛌`, 'amber'),
      _generateTag(9, `${t('tags_default_9_title')} 🥗`, 'green'),
      _generateTag(10, `${t('tags_default_10_title')} 🛍️`, 'pink'),
      _generateTag(11, `${t('tags_default_11_title')} 🎮`, 'slate'),
      _generateTag(12, `${t('tags_default_12_title')} 📺`, 'orange'),
      _generateTag(13, `${t('tags_default_13_title')} 🧘‍♂️`, 'cyan'),
      _generateTag(14, `${t('tags_default_14_title')} 🌳`, 'lime'),
      _generateTag(15, `${t('tags_default_15_title')} 🎨`, 'teal'),
      _generateTag(16, `${t('tags_default_16_title')} 📱`, 'blue'),
      _generateTag(17, `${t('tags_default_17_title')} 💼`, 'slate'),
      _generateTag(18, `${t('tags_default_18_title')} ✈️`, 'sky')
    ]
  }

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  const stateValue: StateValue = useMemo(() => state, [JSON.stringify(state)])

  const createTag = useCallback((tag: Tag) => dispatch({ type: 'add', payload: tag }), [dispatch])
  const updateTag = useCallback((tag: Tag) => dispatch({ type: 'edit', payload: tag }), [dispatch])

  const deleteTag = useCallback((tagId: Tag['id']) => {
    dispatch({ type: 'delete', payload: tagId })

    const newItems = logsState.items.map((item) => {
      if (item.tags.some((tag: Tag) => tag.id === tagId)) {
        const tags = item.tags.filter(itemTag => itemTag.id !== tagId) || [];
        item.tags = tags;
      }
      return item;
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
    if (!settings.loaded) return;

    (async () => {
      const json = await load<State>(STORAGE_KEY)
      if (json !== null) {
        dispatch({ type: 'import', payload: json })
      } else if (settings?.tags) {
        dispatch({
          type: 'import',
          payload: {
            tags: settings.tags
          }
        })
      } else {
        dispatch({ type: 'reset', payload: INITIAL_STATE })
      }
    })();
  }, [settings.loaded])

  useEffect(() => {
    if (state.loaded) {
      store<Omit<State, 'loaded'>>(STORAGE_KEY, _.omit(state, 'loaded'))
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

