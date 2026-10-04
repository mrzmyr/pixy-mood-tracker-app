import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const EXPORT_FILE_PATTERN = /^pixy-mood-tracker-.*\.(?:json|csv)$/u;

const getExportDirectories = (): string[] =>
  [FileSystem.cacheDirectory, FileSystem.documentDirectory].filter(
    (directory): directory is string => Boolean(directory)
  );

/** URIs of export files in `directory`. Empty when the folder is unreadable. */
const listExportFiles = async (directory: string): Promise<string[]> => {
  try {
    const names = await FileSystem.readDirectoryAsync(directory);
    return names.flatMap((name) =>
      EXPORT_FILE_PATTERN.test(name) ? [`${directory}${name}`] : []
    );
  } catch {
    // The folder may not exist yet. Nothing to clean up then.
    return [];
  }
};

const deleteQuietly = async (uri: string): Promise<void> => {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Best effort. A leftover file is not worth failing the export.
  }
};

/**
 * Deletes files from earlier exports.
 *
 * Versions up to 1.88.0 wrote every export into the documents folder and
 * never removed it, so old exports sat in the app sandbox and travelled with
 * iOS device backups. Best effort: a failure here must not stop an export.
 */
export const removeLeftoverExportFiles = async (): Promise<void> => {
  const files = await Promise.all(getExportDirectories().map(listExportFiles));
  await Promise.all(files.flat().map(deleteQuietly));
};

/**
 * Writes `contents` to the cache folder and hands the file to
 * `openShareSheet`. Resolves `false` when sharing is unavailable.
 *
 * The cache folder stays out of OS backups and the system may purge it.
 * iOS deletes the file as soon as the share sheet closes. Android keeps it
 * until the next export, because the receiving app may read the file later
 * (Gmail attaches by reference).
 */
export const shareExportFile = async (
  filename: string,
  contents: string,
  openShareSheet: (uri: string) => Promise<boolean>
): Promise<boolean> => {
  await removeLeftoverExportFiles();

  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, contents);

  try {
    return await openShareSheet(uri);
  } finally {
    if (Platform.OS === "ios") {
      await deleteQuietly(uri);
    }
  }
};
