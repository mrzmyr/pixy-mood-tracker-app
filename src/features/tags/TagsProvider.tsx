import type { TAG_COLOR_NAMES } from "@/constants/Config";
import { createPersistedStore } from "@/state/persisted/createPersistedStore";
import type { Load, LoadInput } from "@/state/persisted/createPersistedStore";

import { t } from "@/lib/translation";
import { useMemo } from "react";
import { useLogUpdater } from "@/features/logs";
import { useSettings, useSettingsLoad } from "@/state/settings";
import {
  arrangeTags,
  GENERAL_CATEGORY_ID,
  normalizeTagCategories,
  reorderCategories,
} from "./tagCategories";
import type { TagArrangement, TagCategoryData } from "./tagCategories";

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
  /** {@link TagCategory} id. Missing on data from before tag categories; read as General. */
  categoryId?: TagCategory["id"];
}

/**
 * User-defined group of tags. Array order is display order in settings and
 * the tag picker. General always exists, see `GENERAL_CATEGORY_ID`.
 */
export interface TagCategory {
  id: string;
  title: string;
}

type State = TagCategoryData;

/** Tags store contents for import; backups from before tag categories have no `categories`. */
interface ImportState {
  tags: Tag[];
  categories?: TagCategory[];
}

type StateAction =
  | { type: "add"; payload: Tag }
  | { type: "edit"; payload: Tag }
  | { type: "delete"; payload: Tag["id"] }
  | { type: "arrange"; payload: TagArrangement[] }
  | { type: "add_category"; payload: TagCategory }
  | { type: "edit_category"; payload: TagCategory }
  | { type: "delete_category"; payload: TagCategory["id"] }
  | { type: "reorder_categories"; payload: TagCategory["id"][] }
  | { type: "import"; payload: ImportState }
  | { type: "reset" };

interface UpdaterValue {
  createTag: (tag: Tag) => void;
  updateTag: (tag: Tag) => void;
  deleteTag: (tagId: Tag["id"]) => void;
  /** Moves listed tags into the given categories and order. */
  arrangeTags: (arrangement: TagArrangement[]) => void;
  createCategory: (category: TagCategory) => void;
  updateCategory: (category: TagCategory) => void;
  /** Deletes a category and moves its tags to General. General stays. */
  deleteCategory: (categoryId: TagCategory["id"]) => void;
  reorderCategories: (categoryIds: TagCategory["id"][]) => void;
  reset: () => void;
  import: (data: ImportState) => void;
}

const _generateTag = (id: number, title: string, color: Tag["color"]): Tag => ({
  id: `${id}`,
  title,
  color,
});

const getDefaultTags = (): Tag[] => [
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
];

const normalize = (tags: Tag[], categories?: TagCategory[]): State =>
  normalizeTagCategories(tags, categories, t("tag_category_general"));

const getInitialState = (): State => normalize(getDefaultTags());

const reducer = (state: State, action: StateAction): State => {
  switch (action.type) {
    case "import": {
      return normalize(action.payload.tags, action.payload.categories);
    }
    case "add": {
      return normalize([...state.tags, action.payload], state.categories);
    }
    case "edit": {
      const previous = state.tags.find((tag) => tag.id === action.payload.id);
      const next = {
        ...action.payload,
        categoryId: action.payload.categoryId ?? previous?.categoryId,
      };
      // A tag that changes category goes to the end of its new category.
      const tags =
        previous && previous.categoryId !== next.categoryId
          ? [...state.tags.filter((tag) => tag.id !== next.id), next]
          : state.tags.map((tag) => (tag.id === next.id ? next : tag));
      return normalize(tags, state.categories);
    }
    case "delete": {
      return {
        ...state,
        tags: state.tags.filter((tag) => tag.id !== action.payload),
      };
    }
    case "arrange": {
      return { ...state, tags: arrangeTags(state.tags, action.payload) };
    }
    case "add_category": {
      return { ...state, categories: [...state.categories, action.payload] };
    }
    case "edit_category": {
      return {
        ...state,
        categories: state.categories.map((category) =>
          category.id === action.payload.id ? action.payload : category
        ),
      };
    }
    case "delete_category": {
      if (action.payload === GENERAL_CATEGORY_ID) {
        return state;
      }
      return normalize(
        state.tags,
        state.categories.filter((category) => category.id !== action.payload)
      );
    }
    case "reorder_categories": {
      return {
        ...state,
        categories: reorderCategories(state.categories, action.payload),
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

const tagsStore = createPersistedStore<
  State,
  StateAction,
  Tag[] | undefined,
  ImportState
>({
  key: STORAGE_KEY,
  name: "Tags",
  // Default tags are built when needed so their titles follow the current
  // locale.
  initial: getInitialState,
  hydrate: (stored, legacySettingsTags) => {
    if (stored !== null) {
      return normalize(stored.tags, stored.categories);
    }
    if (legacySettingsTags) {
      return normalize(legacySettingsTags);
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
      arrangeTags: (arrangement: TagArrangement[]) =>
        dispatch({ type: "arrange", payload: arrangement }),
      createCategory: (category: TagCategory) =>
        dispatch({ type: "add_category", payload: category }),
      updateCategory: (category: TagCategory) =>
        dispatch({ type: "edit_category", payload: category }),
      deleteCategory: (categoryId: TagCategory["id"]) =>
        dispatch({ type: "delete_category", payload: categoryId }),
      reorderCategories: (categoryIds: TagCategory["id"][]) =>
        dispatch({ type: "reorder_categories", payload: categoryIds }),
      reset: () => dispatch({ type: "reset" }),
      import: (data: ImportState) =>
        dispatch({ type: "import", payload: data }),
    }),
    [dispatch, logsUpdater]
  );
};

/** Load status of the tags store; `error` means stored tags exist but could not be read. */
const useTagsLoad = (): Load => tagsStore.useLoad();

export { TagsProvider, useTagsLoad, useTagsState, useTagsUpdater };
