import type { TAG_COLOR_NAMES } from "@/constants/Config";
import { load, store } from "@/helpers/storage";
import { t } from "@/helpers/translation";
import omit from "lodash/omit";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useReducer,
} from "react";
import { useLogUpdater } from "./useLogs";
import { useSettings } from "./useSettings";
import { useContentStableValue } from "./useContentStableValue";
import { createMissingProviderError } from "@/lib/errors";

export const STORAGE_KEY = "PIXEL_TRACKER_TAGS";

export interface Tag {
  id: string;
  title: string;
  color: (typeof TAG_COLOR_NAMES)[number];
  isArchived?: boolean;
}

interface State {
  loaded?: boolean;
  tags: Tag[];
}

type StateAction =
  | { type: "add"; payload: Tag }
  | { type: "edit"; payload: Tag }
  | { type: "delete"; payload: Tag["id"] }
  | { type: "import"; payload: State }
  | { type: "reset"; payload: State };

type StateValue = State;

interface UpdaterValue {
  createTag: (tag: Tag) => void;
  updateTag: (tag: Tag) => void;
  deleteTag: (tagId: Tag["id"]) => void;
  reset: () => void;
  import: (data: State) => void;
}

// SAFETY: every consumer renders inside TagsProvider, which supplies the full state.
const TagsStateContext = createContext({} as StateValue);
// SAFETY: every consumer renders inside TagsProvider, which supplies the full updater.
const TagsUpdaterContext = createContext({} as UpdaterValue);

const reducer = (state: State, action: StateAction): State => {
  switch (action.type) {
    case "import": {
      return {
        ...action.payload,
        loaded: true,
      };
    }
    case "add": {
      return { ...state, tags: [...state.tags, action.payload] };
    }
    case "edit": {
      return {
        ...state,
        tags: state.tags.map((tag) =>
          tag.id === action.payload.id ? action.payload : tag
        ),
      };
    }
    case "delete": {
      return {
        ...state,
        tags: state.tags.filter((tag) => tag.id !== action.payload),
      };
    }
    case "reset": {
      return {
        ...action.payload,
        loaded: true,
      };
    }
    default: {
      return state;
    }
  }
};

const _generateTag = (id: number, title: string, color: Tag["color"]): Tag => ({
  id: `${id}`,
  title,
  color,
});

const getInitialState = (): State => ({
  loaded: false,
  tags: [
    _generateTag(1, `${t("tags_default_1_title")} 🏡`, "slate"),
    _generateTag(2, `${t("tags_default_2_title")} 🤝`, "orange"),
    _generateTag(3, `${t("tags_default_3_title")} ❤️`, "red"),
    _generateTag(4, `${t("tags_default_4_title")} 🏃‍♂️`, "blue"),
    _generateTag(5, `${t("tags_default_5_title")} 🛀`, "teal"),
    _generateTag(6, `${t("tags_default_6_title")} 📚`, "purple"),
    _generateTag(7, `${t("tags_default_7_title")} 🧹`, "indigo"),
    _generateTag(8, `${t("tags_default_8_title")} 🛌`, "amber"),
    _generateTag(9, `${t("tags_default_9_title")} 🥗`, "green"),
    _generateTag(10, `${t("tags_default_10_title")} 🛍️`, "pink"),
    _generateTag(11, `${t("tags_default_11_title")} 🎮`, "slate"),
    _generateTag(12, `${t("tags_default_12_title")} 📺`, "orange"),
    _generateTag(13, `${t("tags_default_13_title")} 🧘‍♂️`, "cyan"),
    _generateTag(14, `${t("tags_default_14_title")} 🌳`, "lime"),
    _generateTag(15, `${t("tags_default_15_title")} 🎨`, "teal"),
    _generateTag(16, `${t("tags_default_16_title")} 📱`, "blue"),
    _generateTag(17, `${t("tags_default_17_title")} 💼`, "slate"),
    _generateTag(18, `${t("tags_default_18_title")} ✈️`, "sky"),
  ],
});

const TagsProvider = ({ children }: { children: React.ReactNode }) => {
  const { settings } = useSettings();
  const logsUpdater = useLogUpdater();

  // Default tags are built when needed so their titles follow the current
  // locale.
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);
  // Reducer updates can produce equal copies; only content changes should
  // persist or notify consumers.
  const stableState = useContentStableValue(state);

  const stateValue: StateValue = stableState;

  const createTag = useCallback(
    (tag: Tag) => dispatch({ type: "add", payload: tag }),
    [dispatch]
  );
  const updateTag = useCallback(
    (tag: Tag) => dispatch({ type: "edit", payload: tag }),
    [dispatch]
  );

  const deleteTag = useCallback(
    (tagId: Tag["id"]) => {
      dispatch({ type: "delete", payload: tagId });
      logsUpdater.removeTagFromLogs(tagId);
    },
    [dispatch, logsUpdater]
  );

  const reset = useCallback(
    () => dispatch({ type: "reset", payload: getInitialState() }),
    [dispatch]
  );
  const importData = useCallback(
    (data: State) => dispatch({ type: "import", payload: data }),
    [dispatch]
  );

  const updaterValue: UpdaterValue = useMemo(
    () => ({
      createTag,
      updateTag,
      deleteTag,
      reset,
      import: importData,
    }),
    [createTag, updateTag, deleteTag, reset, importData]
  );

  // Effect event: legacy tags are read when the load effect runs, without
  // re-running the load when settings tags change.
  const getLegacySettingsTags = useEffectEvent(() => settings.tags);

  useEffect(() => {
    if (!settings.loaded) {
      return;
    }

    const legacySettingsTags = getLegacySettingsTags();

    (async () => {
      let json: State | null;
      try {
        json = await load<State>(STORAGE_KEY);
      } catch {
        // Keep `loaded: false` so the persist effect below stays disabled;
        // resetting to the default tags would overwrite the stored ones.
        return;
      }
      if (json !== null) {
        dispatch({ type: "import", payload: json });
      } else if (legacySettingsTags) {
        dispatch({
          type: "import",
          payload: {
            tags: legacySettingsTags,
          },
        });
      } else {
        dispatch({ type: "reset", payload: getInitialState() });
      }
    })();
  }, [settings.loaded]);

  useEffect(() => {
    if (stableState.loaded) {
      store<Omit<State, "loaded">>(STORAGE_KEY, omit(stableState, "loaded"));
    }
  }, [stableState]);

  return (
    <TagsStateContext.Provider value={stateValue}>
      <TagsUpdaterContext.Provider value={updaterValue}>
        {children}
      </TagsUpdaterContext.Provider>
    </TagsStateContext.Provider>
  );
};

const useTagsState = (): StateValue => {
  const context = useContext(TagsStateContext);
  if (context === undefined) {
    throw createMissingProviderError("useTagsState", "TagsProvider");
  }
  return context;
};

const useTagsUpdater = (): UpdaterValue => {
  const context = useContext(TagsUpdaterContext);
  if (context === undefined) {
    throw createMissingProviderError("useTagsUpdater", "TagsProvider");
  }
  return context;
};

export { TagsProvider, useTagsState, useTagsUpdater };
