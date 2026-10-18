import isEqual from "lodash/isEqual";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useReducer,
  useRef,
  useState,
} from "react";
import type { Dispatch, ReactNode } from "react";
import {
  createMissingProviderError,
  createStructuredError,
} from "@/lib/errors";
import type { StructuredError } from "@/lib/errors";
import { isStorageError, load as loadStored, store } from "@/state/persisted";
import { asyncStorage } from "./storage";
import type { KeyValueStorage } from "./storage";

/**
 * Load status of a persisted store. `error` means stored data exists but
 * could not be read; the store never writes in that state.
 */
export type Load =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; error: StructuredError };

/** Delays the load until `ready`. `input` is read once, when the load starts. */
export type LoadInput<Input> = { ready: false } | { ready: true; input: Input };

/** Configuration of one persisted store. */
export interface PersistedStoreConfig<State, Action, Input, Stored> {
  /** Storage key. Changing it orphans all stored data. */
  key: string;
  /** Store name, used in missing-provider errors, e.g. `Logs`. */
  name: string;
  /** State before the load finishes. Never written. */
  initial: () => State;
  /**
   * Builds state from the stored value: migrate and sanitize. `stored` is
   * unvalidated JSON, or `null` when nothing is stored yet.
   */
  hydrate: (stored: Stored | null, input: Input) => State;
  reducer: (state: State, action: Action) => State;
  /** Hook that delays the load, e.g. until another store is ready. */
  useLoadInput?: () => LoadInput<Input>;
  /** Defaults to AsyncStorage. */
  storage?: KeyValueStorage;
}

/** Provider props of a persisted store. */
export interface PersistedStoreProviderProps<State, Stored> {
  children: ReactNode;
  /** Runs once after the first render with loaded state. */
  onLoad?: (stored: Stored | null, state: State) => void;
}

/** Hooks and provider of one persisted store. */
export interface PersistedStore<State, Action, Stored> {
  Provider: (props: PersistedStoreProviderProps<State, Stored>) => ReactNode;
  useState: () => State;
  useDispatch: () => Dispatch<Action>;
  useLoad: () => Load;
}

type InternalAction<State, Action> =
  | { type: "hydrate"; state: State }
  | { type: "action"; action: Action };

const LOADING: Load = { status: "loading" };
const READY: Load = { status: "ready" };

const useAlwaysReady = (): LoadInput<undefined> => ({
  ready: true,
  input: undefined,
});

const toLoadError = (cause: unknown, key: string): StructuredError =>
  isStorageError(cause)
    ? cause
    : createStructuredError({
        status: "storage_load_failed",
        message: "Stored data could not be loaded",
        why: `Loading storage key "${key}" failed: ${String(cause)}`,
        fix: "Close and reopen the app",
      });

// Keeps the previous reference while content is equal, so equal copies
// neither notify consumers nor write. Shared item references keep the
// comparison cheap.
const useEqualStableValue = <Value,>(value: Value): Value => {
  const [stable, setStable] = useState({ source: value, value });
  if (stable.source !== value) {
    const next = isEqual(stable.value, value) ? stable.value : value;
    setStable({ source: value, value: next });
    return next;
  }
  return stable.value;
};

/**
 * Creates a React store persisted under one storage key.
 *
 * The store owns the storage rules: nothing is written before a successful
 * read, nothing after a failed read, and only content changes are written.
 * Readiness is `useLoad().status === "ready"`; state carries no load flag.
 */
export const createPersistedStore = <
  State,
  Action,
  Input = undefined,
  Stored = State,
>(
  config: PersistedStoreConfig<State, Action, Input, Stored>
): PersistedStore<State, Action, Stored> => {
  const { key, name, initial, hydrate, reducer } = config;
  const storage = config.storage ?? asyncStorage;
  // SAFETY: without `useLoadInput`, `Input` is `undefined` (the default).
  const useLoadInput = (config.useLoadInput ??
    useAlwaysReady) as () => LoadInput<Input>;

  const internalReducer = (
    state: State,
    action: InternalAction<State, Action>
  ): State =>
    action.type === "hydrate" ? action.state : reducer(state, action.action);

  // SAFETY: the provider always supplies a value; `undefined` marks a missing provider.
  const StateContext = createContext<State>(undefined as never);
  const DispatchContext = createContext<Dispatch<Action> | undefined>(
    undefined
  );
  const LoadContext = createContext<Load | undefined>(undefined);

  const Provider = ({
    children,
    onLoad,
  }: PersistedStoreProviderProps<State, Stored>) => {
    const loadInput = useLoadInput();
    const isInputReady = loadInput.ready;
    const [state, dispatchInternal] = useReducer(
      internalReducer,
      undefined,
      initial
    );
    const [load, setLoad] = useState<Load>(LOADING);
    const stableState = useEqualStableValue(state);
    // Last value known to be in storage: the stored value, then each write.
    const persisted = useRef<unknown>(null);
    const loadedValue = useRef<{ stored: Stored | null } | null>(null);

    const readInput = useEffectEvent(() => loadInput);

    useEffect(() => {
      if (!isInputReady) {
        return;
      }
      const current = readInput();
      if (!current.ready) {
        return;
      }
      let isCurrent = true;
      (async () => {
        let next: State;
        let stored: Stored | null;
        try {
          stored = await loadStored<Stored>(key, storage);
          next = hydrate(stored, current.input);
        } catch (error) {
          if (isCurrent) {
            setLoad({ status: "error", error: toLoadError(error, key) });
          }
          return;
        }
        if (!isCurrent) {
          return;
        }
        persisted.current = stored;
        loadedValue.current = { stored };
        dispatchInternal({ type: "hydrate", state: next });
        setLoad(READY);
      })();
      return () => {
        isCurrent = false;
      };
    }, [isInputReady]);

    // Never write before a successful read or after a failed one.
    useEffect(() => {
      if (load.status !== "ready" || isEqual(stableState, persisted.current)) {
        return;
      }
      persisted.current = stableState;
      void store(key, stableState, storage);
    }, [stableState, load.status]);

    const handleLoad = useEffectEvent((stored: Stored | null) => {
      onLoad?.(stored, stableState);
    });

    useEffect(() => {
      if (load.status !== "ready" || loadedValue.current === null) {
        return;
      }
      const { stored } = loadedValue.current;
      loadedValue.current = null;
      // oxlint-disable-next-line react-doctor/no-pass-data-to-parent -- `onLoad` runs side effects after the first loaded render (analytics, file cleanup); it hands no state back.
      handleLoad(stored);
    }, [load.status]);

    const dispatch = useCallback(
      (action: Action) => dispatchInternal({ type: "action", action }),
      []
    );

    return (
      <StateContext.Provider value={stableState}>
        <DispatchContext.Provider value={dispatch}>
          <LoadContext.Provider value={load}>{children}</LoadContext.Provider>
        </DispatchContext.Provider>
      </StateContext.Provider>
    );
  };

  const useStoreState = (): State => {
    const value = useContext(StateContext);
    if (value === undefined) {
      throw createMissingProviderError(`${name}.useState`, `${name}Provider`);
    }
    return value;
  };

  const useStoreDispatch = (): Dispatch<Action> => {
    const value = useContext(DispatchContext);
    if (value === undefined) {
      throw createMissingProviderError(
        `${name}.useDispatch`,
        `${name}Provider`
      );
    }
    return value;
  };

  const useStoreLoad = (): Load => {
    const value = useContext(LoadContext);
    if (value === undefined) {
      throw createMissingProviderError(`${name}.useLoad`, `${name}Provider`);
    }
    return value;
  };

  return {
    Provider,
    useState: useStoreState,
    useDispatch: useStoreDispatch,
    useLoad: useStoreLoad,
  };
};
