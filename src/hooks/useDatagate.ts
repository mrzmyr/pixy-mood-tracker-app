import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import OneSignal from 'react-native-onesignal';
import { getJSONSchemaType, ImportData } from "@/helpers/Import";
import { migrateImportData } from "@/helpers/migration";
import { askToImport, askToReset, showImportError, showImportSuccess, showResetSuccess } from "@/helpers/prompts";
import { t } from "@/helpers/translation";
import pkg from '../../package.json';
import { useAnalytics } from "./useAnalytics";
import { LogsState, STORAGE_KEY as STORAGE_KEY_LOGS, useLogState, useLogUpdater } from "./useLogs";
import { ExportSettings, STORAGE_KEY as STORAGE_KEY_SETTINGS, useSettings } from "./useSettings";
import { STORAGE_KEY as STORAGE_KEY_TAGS, Tag, useTagsState, useTagsUpdater } from "./useTags";

type ResetType = "factory" | "data"

type ExportData = {
  version: string;
  tags: Tag[];
  items: LogsState['items'];
  settings: ExportSettings;
}

export const useDatagate = (): {
  openExportDialog: () => Promise<void>;
  openImportDialog: () => Promise<void>;
  import: (data: ImportData, options: { muted: boolean }) => Promise<void>;
  openDangerousImportDirectlyToAsyncStorageDialog: () => Promise<void>;
  openResetDialog: (type: ResetType) => Promise<void>;
} => {
  const logState = useLogState();
  const logUpdater = useLogUpdater();
  const { tags } = useTagsState();
  const tagsUpdater = useTagsUpdater();
  const { resetSettings, importSettings, settings } = useSettings();

  const analytics = useAnalytics();

  const dangerouslyImportDirectlyToAsyncStorage = async (data: ImportData) => {
    await AsyncStorage.removeItem(STORAGE_KEY_TAGS);
    await AsyncStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify({
      items: data.items,
    }));
    await AsyncStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify({
      ...data.settings,
      actionsDone: [{
        date: new Date().toISOString(),
        title: 'onboarding',
      }],
      tags: data.tags
    }));
  };

  const _import = async (data: ImportData, options: { muted: boolean } = { muted: false }) => {
    const migratedData = migrateImportData(data);
    const jsonSchemaType = getJSONSchemaType(migratedData);

    if (jsonSchemaType === "pixy") {
      logUpdater.import({
        items: migratedData.items,
      });
      tagsUpdater.import({
        tags: migratedData.settings.tags || migratedData.tags || []
      });
      importSettings(migratedData.settings);
      if (!options.muted) showImportSuccess()
      analytics.track("data_import_success");
    } else {
      console.log('import failed, json schema:', jsonSchemaType);
      if (!options.muted) showImportError()
      analytics.track("data_import_error", {
        reason: "invalid_json_schema"
      });
    }
  };

  const reset = () => {
    logUpdater.reset();
    tagsUpdater.reset();
  }

  const factoryReset = () => {
    reset()
    resetSettings();
    analytics.reset()
    OneSignal.removeExternalUserId();
  };

  const openImportDialog = async (): Promise<void> => {
    return askToImport()
      .then(async () => {
        try {
          analytics.track("data_import_start");

          const doc = await DocumentPicker.getDocumentAsync({
            type: "application/json",
            copyToCacheDirectory: true,
          });

          if (doc.type === "success") {
            analytics.track("data_import_success");
            const contents = await FileSystem.readAsStringAsync(doc.uri);
            const data = JSON.parse(contents);

            _import(data);
          }
        } catch (error) {
          showImportError()
          analytics.track("data_import_error", {
            reason: "document_picker_error"
          });
        }
      })
  };

  const openResetDialog = async (type: ResetType) => {
    analytics.track("data_reset_asked");
    const resetFn = type === "factory" ? factoryReset : reset;

    if (Platform.OS === "web") {
      resetFn()
      alert(t("reset_data_success_message"));
      return Promise.resolve();
    }

    return askToReset<ResetType>(type)
      .then(() => {
        resetFn()
        analytics.track("data_reset_success", {
          type
        });
        showResetSuccess<ResetType>(type)
      })
      .catch(() => {
        analytics.track("data_reset_cancel");
      })
  };

  const openExportDialog = async () => {
    const data: ExportData = {
      version: pkg.version,
      items: logState.items,
      tags: tags,
      settings: {
        passcodeEnabled: settings.passcodeEnabled,
        passcode: settings.passcode,
        scaleType: settings.scaleType,
        reminderEnabled: settings.reminderEnabled,
        reminderTime: settings.reminderTime,
        trackBehaviour: settings.trackBehaviour,
        analyticsEnabled: settings.analyticsEnabled,
        actionsDone: settings.actionsDone,
        steps: settings.steps,
      },
    };

    analytics.track("data_export_started");

    if (Platform.OS === "web") {
      return Alert.alert("Not supported on web");
    }

    const filename = `pixel-tracker-${dayjs().format("YYYY-MM-DD")}${__DEV__ ? '-DEV' : ''}.json`;

    await FileSystem.writeAsStringAsync(
      FileSystem.documentDirectory + filename,
      JSON.stringify(data)
    );

    if (!(await Sharing.isAvailableAsync())) {
      alert(t("export_failed_title"));
      return;
    }

    return Sharing.shareAsync(FileSystem.documentDirectory + filename);
  };

  const openDangerousImportDirectlyToAsyncStorageDialog = async () => {
    const doc = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    });

    if (doc.type === "success") {
      const contents = await FileSystem.readAsStringAsync(doc.uri);
      const data = JSON.parse(contents);
      dangerouslyImportDirectlyToAsyncStorage(data);
    }
  };

  return {
    openExportDialog,
    openImportDialog,
    openResetDialog,
    import: _import,
    openDangerousImportDirectlyToAsyncStorageDialog,
  };
};
