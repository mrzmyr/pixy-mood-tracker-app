import type { TAG_COLOR_NAMES } from "@/constants/Config";
import { createPersistedStore } from "@/state/persisted/createPersistedStore";
import type { Load, LoadInput } from "@/state/persisted/createPersistedStore";

import { t } from "@/lib/translation";
import { useMemo } from "react";
import { useLogUpdater } from "@/features/logs";
import { useSettings, useSettingsLoad } from "@/state/settings";

/**
 * AsyncStorage key for tags. Keep the legacy name; changing it orphans all
 * stored tags.
 */
export const STORAGE_KEY = "PIXEL_TRACKER_TAGS";

/**
 * User-defined tag. Log entries reference it by `id` only.
 *
 * Archived tags stay on existing entries but are hidden from statistics,
 * filters, and the tag picker unless the entry already has them.
 */
export interface Tag {
  id: string;
  title: string;
  color: (typeof TAG_COLOR_NAMES)[number];
  isArchived?: boolean;
}

interface State {
  tags: Tag[];
}

type StateAction =
  | { type: "add"; payload: Tag }
  | { type: "edit"; payload: Tag }
  | { type: "delete"; payload: Tag["id"] }
  | { type: "import"; payload: State }
  | { type: "reset" };

interface UpdaterValue {
  createTag: (tag: Tag) => void;
  updateTag: (tag: Tag) => void;
  deleteTag: (tagId: Tag["id"]) => void;
  reset: () => void;
  import: (data: State) => void;
}

const _generateTag = (id: number, title: string, color: Tag["color"]): Tag => ({
  id: `${id}`,
  title,
  color,
});

const getInitialState = (): State => ({
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

const reducer = (state: State, action: StateAction): State => {
  switch (action.type) {
    case "import": {
      return { tags: action.payload.tags };
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
      return getInitialState();
    }
    default: {
      return state;
    }
  }
};

// Legacy tags live in settings, so the load waits for settings.
const useLegacySettingsTags = (): LoadInput<Tag[] | undefined> => {
  const { settings } = useSettings();
  const { status } = useSettingsLoad();
  return status === "ready"
    ? { ready: true, input: settings.tags }
    : { ready: false };
};

const tagsStore = createPersistedStore<State, StateAction, Tag[] | undefined>({
  key: STORAGE_KEY,
  name: "Tags",
  // Default tags are built when needed so their titles follow the current
  // locale.
  initial: getInitialState,
  hydrate: (stored, legacySettingsTags) => {
    if (stored !== null) {
      return { tags: stored.tags };
    }
    if (legacySettingsTags) {
      return { tags: legacySettingsTags };
    }
    return getInitialState();
  },
  reducer,
  useLoadInput: useLegacySettingsTags,
});

/** Tags store. Must render inside `SettingsProvider` and `LogsProvider`. */
const TagsProvider = tagsStore.Provider;

const useTagsState = (): State => tagsStore.useState();

const useTagsUpdater = (): UpdaterValue => {
  const dispatch = tagsStore.useDispatch();
  const logsUpdater = useLogUpdater();

  return useMemo(
    () => ({
      createTag: (tag: Tag) => dispatch({ type: "add", payload: tag }),
      updateTag: (tag: Tag) => dispatch({ type: "edit", payload: tag }),
      deleteTag: (tagId: Tag["id"]) => {
        dispatch({ type: "delete", payload: tagId });
        logsUpdater.removeTagFromLogs(tagId);
      },
      reset: () => dispatch({ type: "reset" }),
      import: (data: State) => dispatch({ type: "import", payload: data }),
    }),
    [dispatch, logsUpdater]
  );
};

/** Load status of the tags store; `error` means stored tags exist but could not be read. */
const useTagsLoad = (): Load => tagsStore.useLoad();

export { TagsProvider, useTagsLoad, useTagsState, useTagsUpdater };
