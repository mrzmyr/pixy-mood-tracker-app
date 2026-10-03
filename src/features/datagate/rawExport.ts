import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import { STORAGE_KEY as STORAGE_KEY_LOGS } from "@/features/logs";
import { STORAGE_KEY as STORAGE_KEY_PEOPLE } from "@/features/people";
import { STORAGE_KEY as STORAGE_KEY_TAGS } from "@/features/tags";
import { createStructuredError } from "@/lib/errors";
import { STORAGE_KEY as STORAGE_KEY_SETTINGS } from "@/state/settings";
import pkg from "../../../package.json";
import { shareExportFile } from "./exportFile";

const STORAGE_KEYS = [
  STORAGE_KEY_LOGS,
  STORAGE_KEY_SETTINGS,
  STORAGE_KEY_TAGS,
  STORAGE_KEY_PEOPLE,
];

/**
 * Shares a backup file with the stored values as AsyncStorage holds them,
 * unparsed, so data that cannot be loaded still leaves the device unchanged.
 *
 * Never writes to AsyncStorage. The file is not a Pixy export: the import
 * dialog rejects it.
 */
export const exportRawStorage = async () => {
  const filename = `pixy-mood-tracker-raw-${dayjs().format("YYYY-MM-DD")}.json`;
  let isShared: boolean;

  try {
    const entries = await AsyncStorage.multiGet(STORAGE_KEYS);
    isShared = await shareExportFile(
      filename,
      JSON.stringify({
        version: pkg.version,
        storage: Object.fromEntries(entries),
      })
    );
  } catch (error) {
    throw createStructuredError({
      status: "raw_export_failed",
      message: "Stored data could not be exported",
      why: `Writing or sharing the backup file failed: ${String(error)}`,
      fix: "Check available device storage and export again",
    });
  }

  if (!isShared) {
    throw createStructuredError({
      status: "raw_export_unavailable",
      message: "Stored data could not be exported",
      why: "Sharing files is not available on this device",
      fix: "Contact support",
    });
  }
};
