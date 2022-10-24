import AsyncStorage from "@react-native-async-storage/async-storage";
import _ from "lodash";
import create from "zustand";
import { persist } from "zustand/middleware";
import { AtLeast } from "../types";
import { LogItem, LogsState, STORAGE_KEY as STORAGE_KEY_PREV } from "./useLogs";

const STORAGE_KEY = "PIXEL_TRACKER_LOGS_ZUSTAND";

interface StateProps {
  _hasHydrated: boolean;
  items: {
    [id: string]: LogItem;
  };
}

interface StateFns {
  _setHasHydrated: (hasHydrated: boolean) => void;
  addLog: (item: LogItem) => void;
  editLog: (item: AtLeast<LogItem, "date">) => void;
  updateLogs: (items: LogsState["items"]) => void;
  deleteLog: (item: LogItem) => void;
  reset: () => void;
}

type State = StateProps & StateFns;

const storage = {
  ...AsyncStorage,
  getItem: async (name: string): Promise<string | null> => {
    const prev_json = await AsyncStorage.getItem(STORAGE_KEY_PREV);
    const zustand_json = await AsyncStorage.getItem(name);

    const hasPrevState = prev_json !== null && prev_json !== undefined;
    const hasZustandState = zustand_json !== undefined && zustand_json !== null;

    if (hasZustandState) {
      // const zustandState = JSON.parse(zustand_json || '{}')
      // console.log("loaded_from_zustand");
      // analytics.track('loaded_from_zustand', {
      //   version: zustandState.version
      // })
      return zustand_json;
    }

    if (hasPrevState) {
      // console.log("loaded_from_prev");
      // analytics.track('loaded_from_prev')
      return JSON.stringify({
        state: JSON.parse(prev_json),
        version: 0,
      });
    }

    return null;
  },
};

const INITIAL_STATE: StateProps = {
  _hasHydrated: false,
  items: {},
};

const storageProps = {
  name: STORAGE_KEY,
  getStorage: () => storage,
  partialize: (state) => _.omit(state, ["_hasHydrated"]),
  onRehydrateStorage: () => (state, error) => {
    if (state !== undefined) {
      state._setHasHydrated(true);
    }
  },
};

const store = (set, get) => ({
  ...INITIAL_STATE,

  _setHasHydrated: (state) => {
    set({
      _hasHydrated: state,
    });
  },

  addLog: (payload) =>
    set((state) => {
      state.items[payload.date] = payload;
      return state;
    }),
  editLog: (payload) =>
    set((state) => {
      state.items[payload.date] = {
        ...state.items[payload.date],
        ...payload,
      };
      return state;
    }),
  updateLogs: (payload) =>
    set((state) => {
      const prevState = get();
      for (const key in payload) {
        prevState.items[key] = payload[key]
      }
      return prevState;
    }),
  deleteLog: (payload) =>
    set((state) => {
      delete state.items[payload.date];
      return state;
    }),
  reset: async () => {
    await storage.clear()
    set({
      ...INITIAL_STATE,
    })
  },
});

const storeProps = persist<State>(store, storageProps);

export const useLogStore = create<State>()(storeProps)
