import * as FileSystem from "expo-file-system/legacy";
import * as Sentry from '@sentry/react-native';
import dayjs from "dayjs";
import { createStorageError, toStorageError } from "./storage";

// Daily copies of the stored logs, kept as files so they neither count
// against the AsyncStorage size limit nor share its failure modes. Files in
// the document directory are also included in iOS device backups.
export const MAX_LOG_SNAPSHOTS = 7;

const SNAPSHOT_PREFIX = "logs-";
const SNAPSHOT_SUFFIX = ".json";

export interface LogSnapshot {
  date: string;
  uri: string;
}

const snapshotDirectory = () =>
  FileSystem.documentDirectory
    ? `${FileSystem.documentDirectory}snapshots/`
    : null;

const snapshotDate = (fileName: string) =>
  fileName.slice(SNAPSHOT_PREFIX.length, -SNAPSHOT_SUFFIX.length);

const isSnapshotFile = (fileName: string) =>
  fileName.startsWith(SNAPSHOT_PREFIX) &&
  fileName.endsWith(SNAPSHOT_SUFFIX) &&
  /^\d{4}-\d{2}-\d{2}$/.test(snapshotDate(fileName));

// Newest first. Returns an empty list when snapshots are unsupported (web).
export const listLogSnapshots = async (): Promise<LogSnapshot[]> => {
  const directory = snapshotDirectory();
  if (!directory) return [];

  const info = await FileSystem.getInfoAsync(directory);
  if (!info.exists) return [];

  const fileNames = await FileSystem.readDirectoryAsync(directory);
  return fileNames
    .filter(isSnapshotFile)
    .sort()
    .reverse()
    .map((fileName) => ({
      date: snapshotDate(fileName),
      uri: `${directory}${fileName}`,
    }));
};

// Saves at most one snapshot per day, taken from the data as it was loaded,
// and keeps the newest `MAX_LOG_SNAPSHOTS`. Never throws: a failed snapshot
// must not block the app, so errors are only reported.
export const snapshotLogs = async (
  data: { items: unknown[] },
  now = dayjs(),
): Promise<void> => {
  const directory = snapshotDirectory();
  if (!directory || data.items.length === 0) return;

  try {
    const uri = `${directory}${SNAPSHOT_PREFIX}${now.format("YYYY-MM-DD")}${SNAPSHOT_SUFFIX}`;
    const contents = JSON.stringify(data);

    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    if ((await FileSystem.getInfoAsync(uri)).exists) return;
    await FileSystem.writeAsStringAsync(uri, contents);

    const snapshots = await listLogSnapshots();
    for (const snapshot of snapshots.slice(MAX_LOG_SNAPSHOTS)) {
      await FileSystem.deleteAsync(snapshot.uri, { idempotent: true });
    }
  } catch (cause) {
    const error = createStorageError(
      "log_snapshot_failed",
      "Automatic backup could not be saved",
      `Writing the daily log snapshot failed: ${toStorageError(cause).why}`,
      "Export your data manually and check available device storage",
    );
    console.error(error);
    Sentry.captureException(error);
  }
};

export const readLogSnapshot = async (
  snapshot: LogSnapshot,
): Promise<{ items: unknown[] }> => {
  let data: unknown;
  try {
    data = JSON.parse(await FileSystem.readAsStringAsync(snapshot.uri));
  } catch (cause) {
    throw createStorageError(
      "log_snapshot_unreadable",
      "Automatic backup could not be read",
      `Reading the snapshot from ${snapshot.date} failed: ${toStorageError(cause).why}`,
      "Choose another backup or import an exported file",
    );
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !Array.isArray((data as { items?: unknown }).items)
  ) {
    throw createStorageError(
      "log_snapshot_invalid",
      "Automatic backup is invalid",
      `The snapshot from ${snapshot.date} has no list of entries`,
      "Choose another backup or import an exported file",
    );
  }

  return data as { items: unknown[] };
};
