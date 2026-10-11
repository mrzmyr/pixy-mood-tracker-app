import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Key-value port every persisted store reads and writes through. Values are
 * raw strings; `get` returns `null` only for a missing key.
 */
export interface KeyValueStorage {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  multiGet: (
    keys: readonly string[]
  ) => Promise<readonly (readonly [string, string | null])[]>;
}

/** Production adapter over AsyncStorage. */
export const asyncStorage: KeyValueStorage = {
  get: (key) => AsyncStorage.getItem(key),
  set: (key, value) => AsyncStorage.setItem(key, value),
  multiGet: (keys) => AsyncStorage.multiGet([...keys]),
};

/**
 * In-memory adapter for tests. `entries` seeds the stored values; `writes`
 * records every `set` in order.
 */
export const createMemoryStorage = (entries: Record<string, string> = {}) => {
  const values = new Map(Object.entries(entries));
  const writes: [string, string][] = [];

  const storage: KeyValueStorage & {
    writes: [string, string][];
    values: Map<string, string>;
  } = {
    writes,
    values,
    get: (key) => Promise.resolve(values.get(key) ?? null),
    set: (key, value) => {
      writes.push([key, value]);
      values.set(key, value);
      return Promise.resolve();
    },
    multiGet: (keys) =>
      Promise.resolve(keys.map((key) => [key, values.get(key) ?? null])),
  };
  return storage;
};
