import AsyncStorage from "@react-native-async-storage/async-storage";
import { File } from "expo-file-system";
import { getPhotosDirectory } from "@/features/photos";
import { useAppData, useDatagate } from "@/features/datagate";
import { getFixtureData, getStorageFixtureEntries } from "@/dev/fixtures";
import type { Fixture, StorageFixture } from "@/dev/fixtures";

/**
 * Writes a storage fixture to AsyncStorage. Stores keep their loaded state
 * and write it back on the next change, so restart the app right after.
 */
export const writeStorageFixture = (fixture: StorageFixture) =>
  AsyncStorage.multiSet(getStorageFixtureEntries(fixture));

// Writes fixture photo files. Entries reference them by `fileName`.
const writePhotoFiles = (files: Record<string, string>) => {
  const directory = getPhotosDirectory();
  directory.create({ idempotent: true, intermediates: true });
  for (const [fileName, base64] of Object.entries(files)) {
    const file = new File(directory, fileName);
    file.create({ overwrite: true });
    file.write(base64, { encoding: "base64" });
  }
};

/**
 * Replaces all logs, tags, people, and settings with a fixture through the
 * regular import. `isReady` stays false until every store has read storage,
 * because a store that loads after the import would overwrite the fixture.
 */
export const useLoadFixture = () => {
  const { load: appLoad } = useAppData();
  const datagate = useDatagate();

  const isReady = appLoad.status === "ready";

  const load = (fixture: Fixture) => {
    if (fixture.photoFiles) {
      writePhotoFiles(fixture.photoFiles);
    }
    void datagate.import(getFixtureData(fixture), { muted: true });
  };

  return { isReady, load };
};
