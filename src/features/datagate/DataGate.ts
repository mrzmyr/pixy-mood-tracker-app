import * as Sentry from "@sentry/react-native";
import { createStructuredError } from "@/lib/errors";
import { createCsv } from "./csv";
import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import * as FileSystem from "expo-file-system/legacy";
import { Alert, Platform } from "react-native";
import { shareExportFile } from "./exportFile";
import { getFileTransfer } from "./fileTransfer";
import { getJSONSchemaType } from "./import";
import type { ExportPerson, ImportData } from "./import";

import { migrateImportData } from "./migration";
import {
  askToImport,
  askToReset,
  showImportError,
  showImportSuccess,
  showResetSuccess,
} from "@/helpers/prompts";
import { t } from "@/lib/translation";
import pkg from "../../../package.json";
import { useAnalytics } from "@/state/analytics";
import {
  STORAGE_KEY as STORAGE_KEY_LOGS,
  useLogState,
  useLogUpdater,
} from "@/features/logs";
import type { LogsState } from "@/features/logs";

import {
  STORAGE_KEY as STORAGE_KEY_SETTINGS,
  useSettings,
} from "@/state/settings";
import type { ExportSettings, SettingsState } from "@/state/settings";

import {
  STORAGE_KEY as STORAGE_KEY_TAGS,
  useTagsState,
  useTagsUpdater,
} from "@/features/tags";
import type { Tag } from "@/features/tags";
import {
  STORAGE_KEY as STORAGE_KEY_PEOPLE,
  readAvatarBase64,
  usePeopleState,
  usePeopleUpdater,
  writeAvatarFromBase64,
} from "@/features/people";
import type { Person } from "@/features/people";

/** Contents of an export file. Backups reuse this format. */
export interface ExportData {
  version: string;
  tags: Tag[];
  people: ExportPerson[];
  items: LogsState["items"];
  settings: ExportSettings;
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

/**
 * Settings that go into an export. Device-only settings (device id, backup
 * switch, store review state, photo access dismissal) stay out.
 */
export const toExportSettings = (settings: SettingsState): ExportSettings => ({
  scaleType: settings.scaleType,
  reminderEnabled: settings.reminderEnabled,
  reminderTime: settings.reminderTime,
  trackBehaviour: settings.trackBehaviour,
  analyticsEnabled: settings.analyticsEnabled,
  actionsDone: settings.actionsDone,
  steps: settings.steps,
});

/** Builds the export payload from app state. Avatars are inlined as base64. */
export const buildExportData = async ({
  items,
  tags,
  people,
  settings,
}: {
  items: LogsState["items"];
  tags: Tag[];
  people: Person[];
  settings: SettingsState;
}): Promise<ExportData> => ({
  version: pkg.version,
  items,
  tags,
  people: await toExportPeople(people),
  settings: toExportSettings(settings),
});

const dangerouslyImportDirectlyToAsyncStorage = async (data: ImportData) => {
  await AsyncStorage.removeItem(STORAGE_KEY_TAGS);
  await AsyncStorage.removeItem(STORAGE_KEY_PEOPLE);
  await AsyncStorage.setItem(
    STORAGE_KEY_LOGS,
    JSON.stringify({
      items: data.items,
    })
  );
  await AsyncStorage.setItem(
    STORAGE_KEY_SETTINGS,
    JSON.stringify({
      ...data.settings,
      actionsDone: [
        {
          date: new Date().toISOString(),
          title: "onboarding",
        },
      ],
      tags: data.tags,
    })
  );
};

const openDangerousImportDirectlyToAsyncStorageDialog = async () => {
  const uri = await getFileTransfer().pickJson();

  if (uri) {
    const contents = await FileSystem.readAsStringAsync(uri);
    const data = JSON.parse(contents);
    dangerouslyImportDirectlyToAsyncStorage(data);
  }
};

interface DatagateValue {
  openExportDialog: (options: { format: "json" | "csv" }) => Promise<void>;
  openImportDialog: () => Promise<void>;
  /** Resolves once every store, including avatar files, holds the data. */
  import: (data: ImportData, options: { muted: boolean }) => Promise<void>;
  openDangerousImportDirectlyToAsyncStorageDialog: () => Promise<void>;
  openResetDialog: () => Promise<void>;
}

/**
 * Export, import, and reset flows for all user data (logs, tags, people,
 * settings).
 *
 * Must render inside the logs, tags, people, and settings providers. Import
 * and reset ask for confirmation first; cancelling leaves data unchanged.
 */
export const useDatagate = (): DatagateValue => {
  const logState = useLogState();
  const logUpdater = useLogUpdater();
  const { tags } = useTagsState();
  const tagsUpdater = useTagsUpdater();
  const { people } = usePeopleState();
  const peopleUpdater = usePeopleUpdater();
  const { resetSettings, importSettings, settings } = useSettings();

  const analytics = useAnalytics();

  const _import = async (
    data: ImportData,
    { muted = false }: { muted?: boolean } = {}
  ) => {
    const migratedData = migrateImportData(data);
    const jsonSchemaType = getJSONSchemaType(migratedData);

    if (jsonSchemaType === "pixy") {
      // No photo sweep right after the import: it replaces all entries, so a
      // sweep here deletes the files of every entry missing from the backup
      // at once. Files stay until the next sweep (logger close, entry
      // delete, or app start), so a second import of the right backup
      // still finds them.

      // Avatar files first: the store must never point at a missing file.
      const importedPeople = await fromExportPeople(migratedData.people ?? []);
      logUpdater.import({
        items: migratedData.items,
      });
      tagsUpdater.import({
        tags: migratedData.settings.tags || migratedData.tags || [],
      });
      peopleUpdater.import({ people: importedPeople });
      importSettings(migratedData.settings);
      if (!muted) {
        showImportSuccess();
      }
      analytics.track("data:import_completed");
    } else {
      console.log("import failed, json schema:", jsonSchemaType);
      if (!muted) {
        showImportError();
      }
      analytics.track("data:import_failed", {
        reason: "invalid_json_schema",
      });
    }
  };

  const reset = () => {
    logUpdater.reset();
    logUpdater.sweepPhotos();
    tagsUpdater.reset();
    peopleUpdater.reset();
    resetSettings();
    analytics.reset();
  };

  const openImportDialog = async (): Promise<void> => {
    await askToImport();

    try {
      analytics.track("data:import_started");

      const uri = await getFileTransfer().pickJson();

      if (uri) {
        const contents = await FileSystem.readAsStringAsync(uri);
        const data = JSON.parse(contents);

        await _import(data);
      }
    } catch {
      showImportError();
      analytics.track("data:import_failed", {
        reason: "document_picker_error",
      });
    }
  };

  const openResetDialog = async () => {
    analytics.track("data:reset_requested", { kind: "factory" });

    if (Platform.OS === "web") {
      reset();
      // oxlint-disable-next-line eslint/no-alert -- web-only branch: react-native-web's Alert.alert is a no-op, so the browser dialog is the only way to confirm the reset.
      alert(t("delete_all_data_success_message"));
      return;
    }

    try {
      await askToReset();
      reset();
      analytics.track("data:reset_completed", { kind: "factory" });
      showResetSuccess();
    } catch {
      analytics.track("data:reset_cancelled", { kind: "factory" });
    }
  };

  const openExportDialog = async ({ format }: { format: "json" | "csv" }) => {
    const data = await buildExportData({
      items: logState.items,
      tags,
      people,
      settings,
    });

    analytics.track("data:export_started", { format });

    if (Platform.OS === "web") {
      return Alert.alert("Not supported on web");
    }

    const filename = `pixy-mood-tracker-${dayjs().format("YYYY-MM-DD")}${__DEV__ ? "-DEV" : ""}.${format}`;
    let isShared = false;
    try {
      const contents =
        format === "csv"
          ? createCsv({ items: logState.items, tags })
          : JSON.stringify(data);
      isShared = await shareExportFile(filename, contents);
    } catch {
      Sentry.captureException(
        createStructuredError({
          status: "data_export_failed",
          message: "Data could not be exported",
          why: "Creating or sharing the export file failed",
          fix: "Check available device storage and export again",
        })
      );
    }
    if (!isShared) {
      analytics.track("data:export_failed", { format });
      Alert.alert(t("export_failed_title"), t("export_failed_message"));
      return;
    }

    analytics.track("data:export_completed", { format });
  };

  return {
    openExportDialog,
    openImportDialog,
    openResetDialog,
    import: _import,
    openDangerousImportDirectlyToAsyncStorageDialog,
  };
};
