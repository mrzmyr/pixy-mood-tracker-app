import {
  STORAGE_KEY as LOGS_KEY,
  useLogLoad,
  useLogState,
  useLogUpdater,
} from "@/features/logs";
import {
  STORAGE_KEY as PEOPLE_KEY,
  readAvatarBase64,
  usePeopleLoad,
  usePeopleState,
  usePeopleUpdater,
  writeAvatarFromBase64,
} from "@/features/people";
import type { Person } from "@/features/people";
import {
  STORAGE_KEY as TAGS_KEY,
  useTagsLoad,
  useTagsState,
  useTagsUpdater,
} from "@/features/tags";
import {
  INTERVENTIONS_STORAGE_KEY,
  loadInterventionRuns,
  replaceInterventionRuns,
} from "@/features/interventions";
import { useAnalytics } from "@/state/analytics";
import type { Load } from "@/state/persisted/createPersistedStore";
import {
  STORAGE_KEY as SETTINGS_KEY,
  useSettings,
  useSettingsLoad,
} from "@/state/settings";
import { toExportSettings } from "@/state/settings/exportSettings";
import type { Backup } from "./backup";
import type { ExportPerson } from "./import";

/**
 * Every storage key that holds user data. Raw export reads all of them.
 *
 * `gated` stores load in React and block the app on a failed read.
 * Interventions load lazily outside React: a failed read keeps the stored
 * value, hides today's progress, and leaves history out of backups.
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
   * avatars, intervention history, settings (new device id), and the
   * analytics identity.
   */
  resetAll: () => void;
  /** Current data as a backup, avatar files read inline. */
  snapshot: () => Promise<Backup>;
  /**
   * Replaces logs, tags, people, intervention history, and settings with
   * `backup`. Resolves once every store, including avatar files, holds the
   * data. Settings keep device-bound fields. No photo sweep: see `useLogUpdater().sweepPhotos`.
   */
  replaceAll: (backup: Backup) => Promise<void>;
}

/** Inlines each avatar file as base64; a missing file exports as `null`. */
const toExportPeople = (people: Person[]): Promise<ExportPerson[]> =>
  Promise.all(
    people.map(async (person) => {
      const base64 = person.avatar
        ? await readAvatarBase64(person.avatar)
        : null;
      return {
        ...person,
        avatar: base64 === null ? null : { base64, mime: "image/jpeg" },
      };
    })
  );

/** Writes each inline avatar to a file; a corrupt avatar imports as `null`. */
const fromExportPeople = (people: ExportPerson[]): Promise<Person[]> =>
  Promise.all(
    people.map(async (person) => ({
      ...person,
      avatar: person.avatar?.base64
        ? await writeAvatarFromBase64({
            id: person.id,
            base64: person.avatar.base64,
          })
        : null,
    }))
  );

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
  const { items } = useLogState();
  const { tags } = useTagsState();
  const { people } = usePeopleState();
  const logUpdater = useLogUpdater();
  const tagsUpdater = useTagsUpdater();
  const peopleUpdater = usePeopleUpdater();
  const { settings, resetSettings, importSettings } = useSettings();
  const analytics = useAnalytics();

  const resetAll = () => {
    logUpdater.reset();
    logUpdater.sweepPhotos();
    tagsUpdater.reset();
    peopleUpdater.reset();
    void replaceInterventionRuns([]);
    resetSettings();
    analytics.reset();
  };

  const load = combineLoads({
    settings: settingsLoad,
    logs: logsLoad,
    tags: tagsLoad,
    people: peopleLoad,
  });

  const snapshot = async (): Promise<Backup> => ({
    items,
    tags,
    people: await toExportPeople(people),
    interventions: await loadInterventionRuns(),
    settings: toExportSettings(settings),
  });

  const replaceAll = async (backup: Backup) => {
    // Avatar files first: the store must never point at a missing file.
    const importedPeople = await fromExportPeople(backup.people);
    logUpdater.import({ items: backup.items });
    tagsUpdater.import({ tags: backup.tags });
    peopleUpdater.import({ people: importedPeople });
    await replaceInterventionRuns(backup.interventions);
    importSettings(backup.settings);
  };

  return { load, resetAll, snapshot, replaceAll };
};
