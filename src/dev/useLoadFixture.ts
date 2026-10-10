import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import { useAppData, useDatagate } from "@/features/datagate";
import type { ImportData } from "@/features/datagate";
import { importPhoto } from "@/features/photos";
import type { LogPhoto } from "@/types";
import { getFixtureData, getStorageFixtureEntries } from "@/dev/fixtures";
import { FIXTURE_PHOTO_ASSETS } from "@/dev/fixtures/photoAssets";
import type { Fixture, StorageFixture } from "@/dev/fixtures";

/**
 * Writes a storage fixture to AsyncStorage. Stores keep their loaded state
 * and write it back on the next change, so restart the app right after.
 */
export const writeStorageFixture = (fixture: StorageFixture) =>
  AsyncStorage.multiSet(getStorageFixtureEntries(fixture));

/**
 * Imports the bundled photo files that entries reference, like picked
 * photos, and points entries at the stored copies. A file that fails to
 * import keeps its placeholder name; the card shows an empty tile.
 */
const withPhotoFiles = async (data: ImportData): Promise<ImportData> => {
  const items = Array.isArray(data.items) ? data.items : [];
  const fileNames = new Set(
    items.flatMap((item) => (item.photos ?? []).map((photo) => photo.fileName))
  );
  const assets = Object.entries(FIXTURE_PHOTO_ASSETS).filter(([fileName]) =>
    fileNames.has(fileName)
  );
  if (assets.length === 0) {
    return data;
  }
  const imported = await Promise.all(
    assets.map(async ([fileName, module]) => {
      try {
        const [asset] = await Asset.loadAsync(module);
        const uri = asset?.localUri ?? asset?.uri;
        return uri
          ? ([fileName, await importPhoto({ uri, source: "day" })] as const)
          : null;
      } catch (error) {
        console.warn({
          status: "fixture_photo_failed",
          message: `Fixture photo ${fileName} not imported`,
          why: error instanceof Error ? error.message : String(error),
          fix: "Check that the file exists in src/dev/fixtures/photos.",
        });
        return null;
      }
    })
  );
  const stored = new Map<string, LogPhoto>(
    imported.filter((entry) => entry !== null)
  );
  return {
    ...data,
    items: items.map((item) => ({
      ...item,
      photos: item.photos?.map((photo) => {
        const file = stored.get(photo.fileName);
        return file === undefined
          ? photo
          : {
              ...photo,
              fileName: file.fileName,
              width: file.width,
              height: file.height,
            };
      }),
    })),
  };
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

  const load = async (fixture: Fixture) => {
    await datagate.import(await withPhotoFiles(getFixtureData(fixture)), {
      muted: true,
    });
  };

  return { isReady, load };
};
