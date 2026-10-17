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

/**
 * Outcome of `persist()`. `ok: false` means the state is not in storage; the
 * error carries `status`, `message`, `why`, and `fix`.
 */
export type PersistResult =
  | { ok: true }
  | { ok: false; error: StructuredError };

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
  /**
   * Returns `persist`. It resolves once the latest state, including actions
   * dispatched in the same event, is in storage. On a failed write the store
   * state rolls back to the last stored state, so a retry dispatches again.
   * After a failed read it resolves with the load error and writes nothing.
   */
  usePersist: () => () => Promise<PersistResult>;
}

type InternalAction<State, Action> =
  | { type: "hydrate"; state: State }
  | { type: "action"; action: Action };

const LOADING: Load = { status: "loading" };
const READY: Load = { status: "ready" };
const PERSISTED: PersistResult = { ok: true };

const settle = (
  waiting: ((result: PersistResult) => void)[],
  result: PersistResult
) => {
  for (const resolve of waiting) {
    resolve(result);
  }
};

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
 * Writes run one at a time, in order. A failed latest write rolls the state
 * back to the last stored state, so memory never shows unsaved data.
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
  const PersistContext = createContext<
    (() => Promise<PersistResult>) | undefined
  >(undefined);

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
    // Last state known to be in storage: the rollback target of a failed write.
    const lastStored = useRef<State | null>(null);
    // Latest write. Each write waits for the one before, so a later state
    // never lands first. `null` until the first write.
    const writeQueue = useRef<Promise<PersistResult> | null>(null);
    const queuedWrites = useRef(0);
    // `persist` callers waiting for the next write effect.
    const waiters = useRef<((result: PersistResult) => void)[]>([]);
    // Bumped by `persist`, so the write effect runs even for an equal state.
    const [persistRequest, setPersistRequest] = useState(0);

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
        lastStored.current = next;
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
      if (load.status === "error") {
        settle(waiters.current.splice(0), { ok: false, error: load.error });
        return;
      }
      if (load.status !== "ready") {
        return;
      }
      const waiting = waiters.current.splice(0);
      if (isEqual(stableState, persisted.current)) {
        // Equal to the queued state: its write decides. Nothing queued: stored.
        const queued = queuedWrites.current === 0 ? null : writeQueue.current;
        void (async () => settle(waiting, (await queued) ?? PERSISTED))();
        return;
      }
      persisted.current = stableState;
      queuedWrites.current += 1;
      const written = stableState;
      const previous = writeQueue.current;
      const write = (async () => {
        await previous;
        const result = await store(key, written, storage);
        queuedWrites.current -= 1;
        if (result.ok) {
          lastStored.current = written;
        } else if (queuedWrites.current === 0 && lastStored.current !== null) {
          // No later write carries this state: show what storage holds.
          persisted.current = lastStored.current;
          dispatchInternal({ type: "hydrate", state: lastStored.current });
        }
        return result;
      })();
      writeQueue.current = write;
      void (async () => settle(waiting, await write))();
      // oxlint-disable-next-line react/exhaustive-effect-dependencies -- `persistRequest` runs the effect for `persist` calls that change nothing, so their callers resolve.
    }, [stableState, load, persistRequest]);

    const persist = useCallback(
      () =>
        // oxlint-disable-next-line promise/avoid-new -- the write effect resolves it; no existing promise covers "next write done".
        new Promise<PersistResult>((resolve) => {
          waiters.current.push(resolve);
          setPersistRequest((request) => request + 1);
        }),
      []
    );

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
          <LoadContext.Provider value={load}>
            <PersistContext.Provider value={persist}>
              {children}
            </PersistContext.Provider>
          </LoadContext.Provider>
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

  const useStorePersist = (): (() => Promise<PersistResult>) => {
    const value = useContext(PersistContext);
    if (value === undefined) {
      throw createMissingProviderError(`${name}.usePersist`, `${name}Provider`);
    }
    return value;
  };

  return {
    Provider,
    useState: useStoreState,
    useDispatch: useStoreDispatch,
    useLoad: useStoreLoad,
    usePersist: useStorePersist,
  };
};
