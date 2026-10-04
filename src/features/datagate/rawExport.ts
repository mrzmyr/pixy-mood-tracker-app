import dayjs from "dayjs";
import { createStructuredError } from "@/lib/errors";
import { asyncStorage } from "@/state/persisted";
import pkg from "../../../package.json";
import { PERSISTED_STORES } from "./appData";
import { shareExportFile } from "./exportFile";

/**
 * Shares a backup file with the stored values as AsyncStorage holds them,
 * unparsed, so data that cannot be loaded still leaves the device unchanged.
 *
 * Reads every key in `PERSISTED_STORES`. Never writes to storage. The file is not a Pixy export: the import
 * dialog rejects it.
 */
export const exportRawStorage = async () => {
  const filename = `pixy-mood-tracker-raw-${dayjs().format("YYYY-MM-DD")}.json`;
  let isShared: boolean;

  try {
    const entries = await asyncStorage.multiGet(
      PERSISTED_STORES.map((store) => store.key)
    );
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
