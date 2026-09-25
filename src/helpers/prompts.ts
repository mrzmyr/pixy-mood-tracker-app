import Alert from "@/components/Alert";
import { createStructuredError } from "@/lib/errors";
import { t } from "./translation";
import noop from "lodash/noop";

const askToConfirm = ({
  title,
  message,
  confirmText,
  cancelText,
}: {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}) =>
  // oxlint-disable-next-line promise/avoid-new -- Alert.alert only reports the choice through button callbacks, so a Promise adapter is required
  new Promise((resolve, reject) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: confirmText,
          onPress: () => resolve({}),
          style: "destructive",
        },
        {
          text: cancelText,
          onPress: () =>
            reject(
              createStructuredError({
                status: "prompt_cancelled",
                message: "Confirmation prompt cancelled",
                why: `The user pressed "${cancelText}" in the "${title}" prompt`,
                fix: "No action needed; the user chose not to continue",
              })
            ),
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  });

/**
 * Ask before discarding unsaved changes.
 *
 * @returns Resolves when the user confirms; rejects with a `prompt_cancelled`
 *   error when the user keeps editing.
 */
export const askToCancel = () =>
  askToConfirm({
    title: t("cancel_confirm_title"),
    message: t("cancel_confirm_message"),
    confirmText: t("discard_changes"),
    cancelText: t("keep_editing"),
  });

/**
 * Ask before deleting an item.
 *
 * @returns Resolves when the user confirms; rejects with a `prompt_cancelled`
 *   error on cancel.
 */
export const askToRemove = () =>
  askToConfirm({
    title: t("delete_confirm_title"),
    message: t("delete_confirm_message"),
    confirmText: t("delete"),
    cancelText: t("cancel"),
  });

/**
 * Ask before an import replaces existing data.
 *
 * @returns Resolves when the user confirms; rejects with a `prompt_cancelled`
 *   error on cancel.
 */
export const askToImport = () =>
  askToConfirm({
    title: t("import_confirm_title"),
    message: t("import_confirm_message"),
    confirmText: t("import_confirm_ok"),
    cancelText: t("cancel"),
  });

/**
 * Ask before a reset. `type` selects the `reset_<type>_confirm_*`
 * translation keys, so it must be a reset type with translations
 * (`factory` or `data`).
 *
 * @returns Resolves when the user confirms; rejects with a `prompt_cancelled`
 *   error on cancel.
 */
export const askToReset = <Type>(type: Type) =>
  askToConfirm({
    title: t(`reset_${type}_confirm_title`),
    message: t(`reset_${type}_confirm_message`),
    confirmText: t("reset"),
    cancelText: t("cancel"),
  });

/** Show the blocking "import succeeded" alert. */
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
};

/** Show the blocking "import failed" alert. */
export const showImportError = () => {
  Alert.alert(
    t("import_error_title"),
    t("import_error_message"),
    [{ text: t("ok"), onPress: noop }],
    { cancelable: false }
  );
};

/**
 * Show the reset success alert. `type` selects the
 * `reset_<type>_success_*` translation keys (`factory` or `data`).
 */
export const showResetSuccess = <Type>(type: Type) => {
  Alert.alert(
    t(`reset_${type}_success_title`),
    t(`reset_${type}_success_message`),
    [
      {
        text: t("ok"),
        onPress: noop,
      },
    ],
    { cancelable: false }
  );
};

/**
 * Ask before disabling a logger step.
 *
 * @returns Resolves when the user confirms; rejects with a `prompt_cancelled`
 *   error on cancel.
 */
export const askToDisableStep = () =>
  askToConfirm({
    title: t("disable_step_confirm_title"),
    message: t("disable_step_confirm_message"),
    confirmText: t("disable"),
    cancelText: t("cancel"),
  });

/**
 * Ask before disabling the feedback step, which has its own warning copy.
 *
 * @returns Resolves when the user confirms; rejects with a `prompt_cancelled`
 *   error on cancel.
 */
export const askToDisableFeedbackStep = () =>
  askToConfirm({
    title: t("disable_feedback_step_confirm_title"),
    message: t("disable_feedback_step_confirm_message"),
    confirmText: t("disable"),
    cancelText: t("cancel"),
  });
