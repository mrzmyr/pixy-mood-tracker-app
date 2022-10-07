import dayjs from "dayjs";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import _ from "lodash";
import { Alert, Platform } from "react-native";
import { getJSONSchemaType } from "../lib/utils";
import { LogsState, useLogs } from "./useLogs";
import { useAnalytics } from "./useAnalytics";
import { SettingsState, useSettings } from "./useSettings";
import { useTranslation } from "./useTranslation";

let openShareDialogAsync = async (uri: string) => {
  const i18n = useTranslation();
  if (!(await Sharing.isAvailableAsync())) {
    alert(i18n.t("export_failed_title"));
    return;
  }

  await Sharing.shareAsync(uri);
};

export const useDatagate = () => {
  const { state, dispatch } = useLogs();
  const { t } = useTranslation();
  const { resetSettings, importSettings, settings } = useSettings();

  const analytics = useAnalytics();

  const _import = (data: {
    items: LogsState["items"];
    settings: SettingsState;
  }) => {
    dispatch({
      type: "import",
      payload: {
        items: data.items,
      },
    });
    importSettings(data.settings);
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

            const jsonSchemaType = getJSONSchemaType(data);

            if (jsonSchemaType === "pixy") {
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
              _import(data);
              resolve(data);
            } else {
              analytics.track("data_import_error", {
                reason: "invalid_json_schema",
              });
              Alert.alert(
                t("import_error_title"),
                t("import_error_message"),
                [{ text: t("ok"), onPress: () => {} }],
                { cancelable: false }
              );
              reject();
            }
          }
        } catch (error) {
          analytics.track("data_import_error", {
            reason: "document_picker_error",
          });
          console.error(error);
          Alert.alert(
            t("import_error_title"),
            t("import_error_message"),
            [{ text: t("ok"), onPress: () => {} }],
            { cancelable: false }
          );
          reject();
        }
      });
    });
  };

  const resetData = () => {
    resetSettings();
    dispatch({ type: "reset" });
  };

  const openResetDialog = async () => {
    analytics.track("data_reset_asked");
    if (Platform.OS === "web") {
      resetData();
      alert(t("reset_data_success_message"));
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      Alert.alert(
        t("reset_data_confirm_title"),
        t("reset_data_confirm_message"),
        [
          {
            text: t("reset"),
            onPress: () => {
              resetData();
              analytics.track("data_reset_success");
              resolve({})
              Alert.alert(
                t("reset_data_success_title"),
                t("reset_data_success_message"),
                [
                  {
                    text: t("ok"),
                    onPress: () => {},
                  },
                ],
                { cancelable: false }
              );
            },
            style: "destructive",
          },
          {
            text: t("cancel"),
            onPress: () => {
              analytics.track("data_reset_cancel");
              reject()
            },
            style: "cancel",
          },
        ],
        { cancelable: true }
      );
    });
  };

  const importData = async (data) => {
    const jsonSchemaType = getJSONSchemaType(data);

    if (jsonSchemaType === "pixy") {
      _import(data);
    } else {
      analytics.track("data_import_error", {
        reason: "invalid_json_schema",
      });
      Alert.alert(
        t("import_error_title"),
        t("import_error_message"),
        [{ text: t("ok"), onPress: () => {} }],
        { cancelable: false }
      );
    }
  };

  const openExportDialog = async () => {
    const data = {
      items: state.items,
      settings: {
        passcodeEnabled: settings.passcodeEnabled,
        passcode: settings.passcode,
        webhookEnabled: settings.webhookEnabled,
        webhookUrl: settings.webhookUrl,
        webhookHistory: settings.webhookHistory,
        scaleType: settings.scaleType,
        reminderEnabled: settings.reminderEnabled,
        reminderTime: settings.reminderTime,
        trackBehaviour: settings.trackBehaviour,
        tags: settings.tags,
      },
    };

    console.log(data);

    analytics.track("data_export_started");

    if (Platform.OS === "web") {
      return Alert.alert("Not supported on web");
    }

    const filename = `pixel-tracker-${dayjs().format("YYYY-MM-DD")}.json`;
    await FileSystem.writeAsStringAsync(
      FileSystem.documentDirectory + filename,
      JSON.stringify(data)
    );
    return openShareDialogAsync(FileSystem.documentDirectory + filename);
  };

  return {
    openExportDialog,
    openImportDialog,
    importData,
    openResetDialog,
  };
};
