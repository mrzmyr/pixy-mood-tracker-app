import Alert from "@/components/Alert";
import { t } from "./translation";

export const askToCancel = () => {
  return new Promise((resolve, reject) => {
    Alert.alert(
      t('cancel_confirm_title'),
      t('cancel_confirm_message'),
      [
        {
          text: t('discard_changes'),
          onPress: () => resolve({}),
          style: "destructive"
        },
        {
          text: t('keep_editing'),
          onPress: () => reject(),
          style: "cancel"
        }
      ],
      { cancelable: true }
    );
  })
}

export const askToRemove = () => {
  return new Promise((resolve, reject) => {
    Alert.alert(
      t('delete_confirm_title'),
      t('delete_confirm_message'),
      [
        {
          text: t('delete'),
          onPress: () => resolve({}),
          style: "destructive"
        },
        {
          text: t('cancel'),
          onPress: () => reject(),
          style: "cancel"
        }
      ],
      { cancelable: true }
    );
  })
}

export const askToImport = () => {
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

export const askToReset = <Type>(type: Type) => {
  return new Promise((resolve, reject) => {
    Alert.alert(
      t(`reset_${type}_confirm_title`),
      t(`reset_${type}_confirm_message`),
      [
        {
          text: t("reset"),
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
}

export const showImportSuccess = () => {
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

export const showImportError = () => {
  Alert.alert(
    t("import_error_title"),
    t("import_error_message"),
    [{ text: t("ok"), onPress: () => { } }],
    { cancelable: false }
  );
}

export const showResetSuccess = <Type>(type: Type) => {
  Alert.alert(
    t(`reset_${type}_success_title`),
    t(`reset_${type}_success_message`),
    [
      {
        text: t("ok"),
        onPress: () => { },
      },
    ],
    { cancelable: false }
  );
}

export const askToDisableStep = () => {
  return new Promise((resolve, reject) => {
    Alert.alert(
      t("disable_step_confirm_title"),
      t("disable_step_confirm_message"),
      [
        {
          text: t("disable"),
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
}

export const askToDisableFeedbackStep = () => {
  return new Promise((resolve, reject) => {
    Alert.alert(
      t("disable_feedback_step_confirm_title"),
      t("disable_feedback_step_confirm_message"),
      [
        {
          text: t("disable"),
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
}