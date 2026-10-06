import * as Sentry from "@sentry/react-native";
import { createStructuredError } from "@/lib/errors";
import { createCsv } from "./csv";
import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import { Alert, Platform } from "react-native";
import { getFileTransfer } from "./fileTransfer";
import type { ImportData } from "./import";
import { useAppData } from "./appData";
import { decodeBackup, decodeBackupData, encodeBackup } from "./backup";
import type { DecodeBackupResult } from "./backup";
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
import { STORAGE_KEY as STORAGE_KEY_LOGS, useLogState } from "@/features/logs";
import { STORAGE_KEY as STORAGE_KEY_SETTINGS } from "@/state/settings";
import { STORAGE_KEY as STORAGE_KEY_TAGS, useTagsState } from "@/features/tags";
import { STORAGE_KEY as STORAGE_KEY_PEOPLE } from "@/features/people";

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
  const contents = await getFileTransfer().pickJsonText();

  if (contents !== null) {
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
 * settings). Owns prompts and analytics; the backup format lives in
 * `backup.ts`, store access in `useAppData`.
 *
 * Must render inside the logs, tags, people, and settings providers. Import
 * and reset ask for confirmation first; cancelling leaves data unchanged.
 */
export const useDatagate = (): DatagateValue => {
  const { items } = useLogState();
  const { tags } = useTagsState();
  const appData = useAppData();
  const analytics = useAnalytics();

  // No photo sweep after an import: it replaces all entries, so a sweep
  // here deletes the files of every entry missing from the backup at once.
  // Files stay until the next sweep (logger close, entry delete, or app
  // start), so a second import of the right backup still finds them.
  const finishImport = async (result: DecodeBackupResult, muted: boolean) => {
    if (result.ok) {
      await appData.replaceAll(result.backup);
      if (!muted) {
        showImportSuccess();
      }
      analytics.track("data:import_completed");
      return;
    }
    if (!muted) {
      showImportError();
    }
    analytics.track("data:import_failed", {
      // Unparsable files reported `document_picker_error` before the codec
      // existed; keep the value so the event history stays comparable.
      reason:
        result.reason === "invalid_json"
          ? "document_picker_error"
          : "invalid_json_schema",
    });
  };

  const _import = (
    data: ImportData,
    { muted = false }: { muted?: boolean } = {}
  ) => finishImport(decodeBackupData(data), muted);

  const openImportDialog = async (): Promise<void> => {
    await askToImport();

    try {
      analytics.track("data:import_started");

      const contents = await getFileTransfer().pickJsonText();

      if (contents !== null) {
        await finishImport(decodeBackup(contents), false);
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
      appData.resetAll();
      // oxlint-disable-next-line eslint/no-alert -- web-only branch: react-native-web's Alert.alert is a no-op, so the browser dialog is the only way to confirm the reset.
      alert(t("delete_all_data_success_message"));
      return;
    }

    try {
      await askToReset();
      appData.resetAll();
      analytics.track("data:reset_completed", { kind: "factory" });
      showResetSuccess();
    } catch {
      analytics.track("data:reset_cancelled", { kind: "factory" });
    }
  };

  const openExportDialog = async ({ format }: { format: "json" | "csv" }) => {
    const backup = await appData.snapshot();

    analytics.track("data:export_started", { format });

    if (Platform.OS === "web") {
      return Alert.alert(t("export_web_unsupported_title"));
    }

    const filename = `pixy-mood-tracker-${dayjs().format("YYYY-MM-DD")}${__DEV__ ? "-DEV" : ""}.${format}`;
    let isShared = false;
    try {
      const contents =
        format === "csv"
          ? createCsv({ items, tags })
          : encodeBackup(backup, pkg.version);
      isShared = await getFileTransfer().share(filename, contents);
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
