import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDatagate } from "@/features/datagate";
import { useLogState } from "@/features/logs";
import { useSetting } from "@/state/settings";
import { useTagsState } from "@/features/tags";
import { getFixtureData, getStorageFixtureEntries } from "@/dev/fixtures";
import type { Fixture, StorageFixture } from "@/dev/fixtures";

/**
 * Writes a storage fixture to AsyncStorage. Stores keep their loaded state
 * and write it back on the next change, so restart the app right after.
 */
export const writeStorageFixture = (fixture: StorageFixture) =>
  AsyncStorage.multiSet(getStorageFixtureEntries(fixture));

/**
 * Replaces all logs, tags, and settings with a fixture through the regular
 * import. `isReady` stays false until every store has read storage, because
 * a store that loads after the import would overwrite the fixture.
 */
export const useLoadFixture = () => {
  const logState = useLogState();
  const { loaded: isTagsLoaded } = useTagsState();
  const isSettingsLoaded = useSetting("loaded");
  const datagate = useDatagate();

  const isReady = Boolean(logState.loaded && isTagsLoaded && isSettingsLoaded);

  const load = (fixture: Fixture) => {
    datagate.import(getFixtureData(fixture), { muted: true });
  };

  return { isReady, load };
};
