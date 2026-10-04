import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDatagate } from "@/features/datagate";
import { useLogLoad } from "@/features/logs";
import { usePeopleLoad } from "@/features/people";
import { useSettingsLoad } from "@/state/settings";
import { useTagsLoad } from "@/features/tags";
import { getFixtureData, getStorageFixtureEntries } from "@/dev/fixtures";
import type { Fixture, StorageFixture } from "@/dev/fixtures";

/**
 * Writes a storage fixture to AsyncStorage. Stores keep their loaded state
 * and write it back on the next change, so restart the app right after.
 */
export const writeStorageFixture = (fixture: StorageFixture) =>
  AsyncStorage.multiSet(getStorageFixtureEntries(fixture));

/**
 * Replaces all logs, tags, people, and settings with a fixture through the
 * regular import. `isReady` stays false until every store has read storage,
 * because a store that loads after the import would overwrite the fixture.
 */
export const useLoadFixture = () => {
  const loads = [
    useLogLoad(),
    useTagsLoad(),
    usePeopleLoad(),
    useSettingsLoad(),
  ];
  const datagate = useDatagate();

  const isReady = loads.every((load) => load.status === "ready");

  const load = (fixture: Fixture) => {
    void datagate.import(getFixtureData(fixture), { muted: true });
  };

  return { isReady, load };
};
