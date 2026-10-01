import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import * as FileSystem from "expo-file-system/legacy";
import { Alert, Platform } from "react-native";
import { shareExportFile } from "./exportFile";
import { getFileTransfer } from "./fileTransfer";
import { getJSONSchemaType } from "./import";
import type { ImportData } from "./import";

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
import type { ExportSettings } from "@/state/settings";

import {
  STORAGE_KEY as STORAGE_KEY_TAGS,
  useTagsState,
  useTagsUpdater,
} from "@/features/tags";
import type { Tag } from "@/features/tags";

interface ExportData {
  version: string;
  tags: Tag[];
  items: LogsState["items"];
  settings: ExportSettings;
}

const dangerouslyImportDirectlyToAsyncStorage = async (data: ImportData) => {
  await AsyncStorage.removeItem(STORAGE_KEY_TAGS);
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
  openExportDialog: () => Promise<void>;
  openImportDialog: () => Promise<void>;
  import: (data: ImportData, options: { muted: boolean }) => void;
  openDangerousImportDirectlyToAsyncStorageDialog: () => Promise<void>;
  openResetDialog: () => Promise<void>;
}

/**
 * Export, import, and reset flows for all user data (logs, tags, settings).
 *
 * Must render inside the logs, tags, and settings providers. Import and
 * reset ask for confirmation first; cancelling leaves data unchanged.
 */
export const useDatagate = (): DatagateValue => {
  const logState = useLogState();
  const logUpdater = useLogUpdater();
  const { tags } = useTagsState();
  const tagsUpdater = useTagsUpdater();
  const { resetSettings, importSettings, settings } = useSettings();

  const analytics = useAnalytics();

  const _import = (
    data: ImportData,
    { muted = false }: { muted?: boolean } = {}
  ) => {
    const migratedData = migrateImportData(data);
    const jsonSchemaType = getJSONSchemaType(migratedData);

    if (jsonSchemaType === "pixy") {
      logUpdater.import({
        items: migratedData.items,
      });
      logUpdater.sweepPhotos();
      tagsUpdater.import({
        tags: migratedData.settings.tags || migratedData.tags || [],
      });
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

        _import(data);
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

  const openExportDialog = async () => {
    const data: ExportData = {
      version: pkg.version,
      items: logState.items,
      tags,
      settings: {
        scaleType: settings.scaleType,
        reminderEnabled: settings.reminderEnabled,
        reminderTime: settings.reminderTime,
        trackBehaviour: settings.trackBehaviour,
        analyticsEnabled: settings.analyticsEnabled,
        actionsDone: settings.actionsDone,
        steps: settings.steps,
      },
    };

    analytics.track("data:export_started");

    if (Platform.OS === "web") {
      return Alert.alert("Not supported on web");
    }

    const filename = `pixy-mood-tracker-${dayjs().format("YYYY-MM-DD")}${__DEV__ ? "-DEV" : ""}.json`;

    const isShared = await shareExportFile(filename, JSON.stringify(data));
    if (!isShared) {
      analytics.track("data:export_failed");
      Alert.alert("Alert", t("export_failed_title"));
      return;
    }

    analytics.track("data:export_completed");
  };

  return {
    openExportDialog,
    openImportDialog,
    openResetDialog,
    import: _import,
    openDangerousImportDirectlyToAsyncStorageDialog,
  };
};
