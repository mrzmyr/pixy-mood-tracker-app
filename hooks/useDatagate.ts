import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import { getJSONSchemaType, ImportData } from "../helpers/Import";
import { migrateImportData } from "../helpers/Migration";
import pkg from '../package.json';
import { useAnalytics } from "./useAnalytics";
import { LogsState, STORAGE_KEY as STORAGE_KEY_LOGS, useLogState, useLogUpdater } from "./useLogs";
import { SettingsState, STORAGE_KEY as STORAGE_KEY_SETTINGS, useSettings } from "./useSettings";
import { STORAGE_KEY as STORAGE_KEY_TAGS } from "./useTags";
import { Tag, useTagsState, useTagsUpdater } from "./useTags";
import { useTranslation } from "./useTranslation";

type ResetType = "factory" | "data"

type ExportData = {
  version: string;
  tags: Tag[];
  items: LogsState['items'];
  settings: Omit<SettingsState, 'loaded' | 'deviceId'>;
}

let openShareDialogAsync = async (uri: string) => {
  const i18n = useTranslation();
  if (!(await Sharing.isAvailableAsync())) {
    alert(i18n.t("export_failed_title"));
    return;
  }

  await Sharing.shareAsync(uri);
};

export const useDatagate = () => {
  const logState = useLogState();
  const logUpdater = useLogUpdater();
  const { tags } = useTagsState();
  const tagsUpdater = useTagsUpdater();
  const { t } = useTranslation();
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
      // tags: data.tags
    }));
  };

  const _import = async (data: ImportData, options: { muted: boolean } = { muted: false }) => {
    const migratedData = migrateImportData(data);
    const jsonSchemaType = getJSONSchemaType(migratedData);

    if (jsonSchemaType === "pixy") {
      logUpdater.import({
        items: data.items,
      });
      tagsUpdater.import({ 
        tags: data.settings.tags || data.tags || [] 
      });
      importSettings(data.settings);
      if(!options.muted) showImportSuccess()
      analytics.track("data_import_success");
    } else {
      if(!options.muted) showImportError()
      analytics.track("data_import_error", {
        reason: "invalid_json_schema"
      });
    }
  };
  
  const resetData = () => {
    logUpdater.reset();
    tagsUpdater.reset();
  }
  
  const factoryReset = () => {
    resetData()
    resetSettings();
    analytics.reset()
  };

  const askToImport = () => {
    return new Promise((resolve, reject) => {
      Alert.alert(
        t("import_confirm_title"),
        t("import_confirm_message"),
        [
          {
            text: t("import_confirm_ok"),
            onPress: () => resolve({}),
            style: "destructive",
          },
          {
            text: t("cancel"),
            onPress: () => reject(),
            style: "cancel",
          },
        ],
        { cancelable: true }
      );
    });
  };

  const showImportSuccess = () => {
    Alert.alert(
      t("import_success_title"),
      t("import_success_message"),
      [
        {
          text: t("ok"),
        },
      ],
      { cancelable: false }
    );
  }
  
  const showImportError = () => {
    Alert.alert(
      t("import_error_title"),
      t("import_error_message"),
      [{ text: t("ok"), onPress: () => {} }],
      { cancelable: false }
    );
  }

  const openImportDialog = async () => {
    return new Promise(async (resolve, reject) => {
      askToImport().then(async () => {
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
            resolve(data);              
            reject();
          }
        } catch (error) {
          showImportError()
          analytics.track("data_import_error", {
            reason: "document_picker_error"
          });
          reject();
        }
      });
    });
  };

  const askToReset = (type: ResetType) => {
    return new Promise((resolve, reject) => {
      Alert.alert(
        t(`reset_${type}_confirm_title`),
        t(`reset_${type}_confirm_message`),
        [
          {
            text: t("reset"),
            onPress: () => {
              resolve({});
            },
            style: "destructive",
          },
          {
            text: t("cancel"),
            onPress: () => {
              reject();
            },
            style: "cancel",
          },
        ],
        { cancelable: true }
      );
    });
  }
  
  const showResetSuccess = (type: ResetType) => {
    Alert.alert(
      t(`reset_${type}_success_title`),
      t(`reset_${type}_success_message`),
      [
        {
          text: t("ok"),
          onPress: () => {},
        },
      ],
      { cancelable: false }
    );
  }

  const openResetDialog = async (type: ResetType) => {
    analytics.track("data_reset_asked");

    if (Platform.OS === "web") {
      factoryReset();
      alert(t("reset_data_success_message"));
      return Promise.resolve();
    }

    askToReset(type)
      .then(() => {
        if(type === 'factory') {
          factoryReset();
        } else {
          resetData();
        }
        analytics.track("data_reset_success", {
          type
        });
        showResetSuccess(type)
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
    return openShareDialogAsync(FileSystem.documentDirectory + filename);
  };

  const openDEVImportDialog = async () => {
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
    openDEVImportDialog,
    import: _import,
    factoryReset,
    resetData,
  };
};
