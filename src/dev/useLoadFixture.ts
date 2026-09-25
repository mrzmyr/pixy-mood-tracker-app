import { useDatagate } from "@/hooks/useDatagate";
import { useLogState } from "@/hooks/useLogs";
import { useSettings } from "@/hooks/useSettings";
import { useTagsState } from "@/hooks/useTags";
import type { Fixture } from "./fixtures";
import { getFixtureData } from "./fixtures";

/**
 * Replaces all logs, tags, and settings with a fixture through the regular
 * import. `isReady` stays false until every store has read storage, because
 * a store that loads after the import would overwrite the fixture.
 */
export const useLoadFixture = () => {
  const logState = useLogState();
  const { loaded: isTagsLoaded } = useTagsState();
  const { settings } = useSettings();
  const datagate = useDatagate();

  const isReady = Boolean(logState.loaded && isTagsLoaded && settings.loaded);

  const load = (fixture: Fixture) => {
    datagate.import(getFixtureData(fixture), { muted: true });
  };

  return { isReady, load };
};
