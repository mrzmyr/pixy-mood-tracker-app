import {
  STORAGE_KEY as LOGS_KEY,
  useLogLoad,
  useLogUpdater,
} from "@/features/logs";
import {
  STORAGE_KEY as PEOPLE_KEY,
  usePeopleLoad,
  usePeopleUpdater,
} from "@/features/people";
import {
  STORAGE_KEY as TAGS_KEY,
  useTagsLoad,
  useTagsUpdater,
} from "@/features/tags";
import { INTERVENTIONS_STORAGE_KEY } from "@/features/interventions";
import { useAnalytics } from "@/state/analytics";
import type { Load } from "@/state/persisted/createPersistedStore";
import {
  STORAGE_KEY as SETTINGS_KEY,
  useSettings,
  useSettingsLoad,
} from "@/state/settings";

/**
 * Every storage key that holds user data. Raw export reads all of them.
 *
 * `gated` stores load in React and block the app on a failed read.
 * Interventions load lazily outside React: a failed read keeps the stored
 * value and only hides today's progress.
 */
export const PERSISTED_STORES = [
  { name: "settings", key: SETTINGS_KEY, gated: true },
  { name: "logs", key: LOGS_KEY, gated: true },
  { name: "tags", key: TAGS_KEY, gated: true },
  { name: "people", key: PEOPLE_KEY, gated: true },
  { name: "interventions", key: INTERVENTIONS_STORAGE_KEY, gated: false },
] as const;

type GatedStoreName = Extract<
  (typeof PERSISTED_STORES)[number],
  { gated: true }
>["name"];

/** Aggregate state and verbs over every persisted store. */
export interface AppData {
  /** First error in `PERSISTED_STORES` order wins; ready when all are ready. */
  load: Load;
  /**
   * Factory reset: logs, unreferenced photo files, tags, people with their
   * avatars, settings (new device id), and the analytics identity.
   */
  resetAll: () => void;
}

const combineLoads = (loads: Record<GatedStoreName, Load>): Load => {
  let isLoading = false;
  for (const { name, gated } of PERSISTED_STORES) {
    if (!gated) {
      continue;
    }
    const load = loads[name];
    if (load.status === "error") {
      return load;
    }
    if (load.status === "loading") {
      isLoading = true;
    }
  }
  return isLoading ? { status: "loading" } : { status: "ready" };
};

/**
 * App-wide data access. Must render inside the settings, analytics, logs,
 * tags, and people providers.
 */
export const useAppData = (): AppData => {
  const settingsLoad = useSettingsLoad();
  const logsLoad = useLogLoad();
  const tagsLoad = useTagsLoad();
  const peopleLoad = usePeopleLoad();
  const logUpdater = useLogUpdater();
  const tagsUpdater = useTagsUpdater();
  const peopleUpdater = usePeopleUpdater();
  const { resetSettings } = useSettings();
  const analytics = useAnalytics();

  const resetAll = () => {
    logUpdater.reset();
    logUpdater.sweepPhotos();
    tagsUpdater.reset();
    peopleUpdater.reset();
    resetSettings();
    analytics.reset();
  };

  const load = combineLoads({
    settings: settingsLoad,
    logs: logsLoad,
    tags: tagsLoad,
    people: peopleLoad,
  });

  return { load, resetAll };
};
