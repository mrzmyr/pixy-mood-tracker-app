import { act, renderHook, waitFor } from "@testing-library/react-native";
import { createStructuredError } from "@/lib/errors";
import { createPersistedStore } from "../createPersistedStore";
import type { LoadInput } from "../createPersistedStore";
import { createMemoryStorage } from "../storage";
import type { KeyValueStorage } from "../storage";

const KEY = "TEST_STORE";

interface Counter {
  count: number;
}

type CounterAction = { type: "increment" } | { type: "set"; count: number };

const counterReducer = (state: Counter, action: CounterAction): Counter =>
  action.type === "increment"
    ? { count: state.count + 1 }
    : { count: action.count };

const createCounterStore = (
  storage: KeyValueStorage,
  options: {
    hydrate?: (stored: Counter | null, input: number) => Counter;
    useLoadInput?: () => LoadInput<number>;
  } = {}
) =>
  createPersistedStore<Counter, CounterAction, number>({
    key: KEY,
    name: "Counter",
    initial: () => ({ count: -1 }),
    hydrate:
      options.hydrate ??
      ((stored, input) => ({ count: (stored?.count ?? 0) + input })),
    reducer: counterReducer,
    useLoadInput: options.useLoadInput ?? (() => ({ ready: true, input: 0 })),
    storage,
  });

const renderStore = (
  store: ReturnType<typeof createCounterStore>,
  onLoad?: (stored: Counter | null, state: Counter) => void
) =>
  renderHook(
    () => ({
      state: store.useState(),
      dispatch: store.useDispatch(),
      load: store.useLoad(),
    }),
    {
      wrapper: ({ children }) => (
        <store.Provider onLoad={onLoad}>{children}</store.Provider>
      ),
    }
  );

const _console_error = console.error;

describe("createPersistedStore", () => {
  beforeEach(() => {
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = _console_error;
  });

  test("hydrates missing data and writes the result once", async () => {
    const storage = createMemoryStorage();
    const hook = await renderStore(createCounterStore(storage));

    await waitFor(() => {
      expect(hook.result.current.load.status).toBe("ready");
    });

    expect(hook.result.current.state).toEqual({ count: 0 });
    expect(storage.writes).toEqual([[KEY, '{"count":0}']]);
  });

  test("hydrates stored data and does not write it back unchanged", async () => {
    const storage = createMemoryStorage({ [KEY]: '{"count":4}' });
    const hook = await renderStore(createCounterStore(storage));

    await waitFor(() => {
      expect(hook.result.current.load.status).toBe("ready");
    });

    expect(hook.result.current.state).toEqual({ count: 4 });
    expect(storage.writes).toEqual([]);
  });

  test("writes the migrated state when hydrate changes stored data", async () => {
    const storage = createMemoryStorage({ [KEY]: '{"count":4}' });
    const store = createCounterStore(storage, {
      hydrate: (stored) => ({ count: (stored?.count ?? 0) * 10 }),
    });
    const hook = await renderStore(store);

    await waitFor(() => {
      expect(hook.result.current.load.status).toBe("ready");
    });

    expect(storage.values.get(KEY)).toBe('{"count":40}');
  });

  test("never writes after a failed read, even after changes", async () => {
    const storage = createMemoryStorage({ [KEY]: '{"count":4}' });
    const failingStorage: KeyValueStorage = {
      ...storage,
      get: () => Promise.reject(new Error("disk unavailable")),
    };
    const hook = await renderStore(createCounterStore(failingStorage));

    await waitFor(() => {
      expect(hook.result.current.load.status).toBe("error");
    });
    expect(hook.result.current.load).toEqual({
      status: "error",
      error: expect.objectContaining({
        status: "storage_read_failed",
        why: expect.stringContaining("disk unavailable"),
        fix: expect.any(String),
      }),
    });

    await act(() => {
      hook.result.current.dispatch({ type: "set", count: 99 });
    });

    expect(storage.writes).toEqual([]);
    expect(storage.values.get(KEY)).toBe('{"count":4}');
  });

  test("never writes over stored data that cannot be parsed", async () => {
    const storage = createMemoryStorage({ [KEY]: "🐇" });
    const hook = await renderStore(createCounterStore(storage));

    await waitFor(() => {
      expect(hook.result.current.load.status).toBe("error");
    });
    expect(hook.result.current.load).toEqual({
      status: "error",
      error: expect.objectContaining({ status: "storage_invalid_value" }),
    });

    await act(() => {
      hook.result.current.dispatch({ type: "increment" });
    });

    expect(storage.writes).toEqual([]);
    expect(storage.values.get(KEY)).toBe("🐇");
  });

  test("treats a hydrate failure as a load error and never writes", async () => {
    const storage = createMemoryStorage({ [KEY]: '{"count":4}' });
    const store = createCounterStore(storage, {
      hydrate: () => {
        throw createStructuredError({
          status: "test_bad_shape",
          message: "Bad shape",
          why: "Test hydrate rejects every value",
          fix: "None",
        });
      },
    });
    const hook = await renderStore(store);

    await waitFor(() => {
      expect(hook.result.current.load.status).toBe("error");
    });
    expect(hook.result.current.load).toEqual({
      status: "error",
      error: expect.objectContaining({
        status: "test_bad_shape",
      }),
    });
    expect(storage.writes).toEqual([]);
  });

  test("never writes before the read finishes", async () => {
    const storage = createMemoryStorage({ [KEY]: '{"count":4}' });
    const read = Promise.withResolvers<string | null>();
    const slowStorage: KeyValueStorage = {
      ...storage,
      get: () => read.promise,
    };
    const hook = await renderStore(createCounterStore(slowStorage));

    await act(() => {
      hook.result.current.dispatch({ type: "set", count: 99 });
    });
    expect(hook.result.current.load.status).toBe("loading");
    expect(storage.writes).toEqual([]);

    await act(async () => {
      read.resolve('{"count":4}');
      await read.promise;
    });

    expect(hook.result.current.load.status).toBe("ready");
    expect(hook.result.current.state).toEqual({ count: 4 });
    expect(storage.writes).toEqual([]);
  });

  test("writes changes and skips equal state", async () => {
    const storage = createMemoryStorage({ [KEY]: '{"count":4}' });
    const hook = await renderStore(createCounterStore(storage));
    await waitFor(() => {
      expect(hook.result.current.load.status).toBe("ready");
    });
    const loadedState = hook.result.current.state;

    await act(() => {
      hook.result.current.dispatch({ type: "set", count: 4 });
    });
    expect(hook.result.current.state).toBe(loadedState);
    expect(storage.writes).toEqual([]);

    await act(() => {
      hook.result.current.dispatch({ type: "increment" });
    });
    expect(storage.writes).toEqual([[KEY, '{"count":5}']]);
  });

  test("waits for the load input and hydrates with it", async () => {
    const storage = createMemoryStorage({ [KEY]: '{"count":4}' });
    let input: LoadInput<number> = { ready: false };
    const store = createCounterStore(storage, { useLoadInput: () => input });
    const hook = await renderStore(store);

    await act(async () => {
      await Promise.resolve();
    });
    expect(hook.result.current.load.status).toBe("loading");
    expect(hook.result.current.state).toEqual({ count: -1 });

    input = { ready: true, input: 100 };
    await hook.rerender({});

    await waitFor(() => {
      expect(hook.result.current.load.status).toBe("ready");
    });
    expect(hook.result.current.state).toEqual({ count: 104 });
  });

  test("calls `onLoad` once with the stored value and the loaded state", async () => {
    const storage = createMemoryStorage({ [KEY]: '{"count":4}' });
    const onLoad = jest.fn();
    const hook = await renderStore(createCounterStore(storage), onLoad);

    await waitFor(() => {
      expect(hook.result.current.load.status).toBe("ready");
    });
    await act(() => {
      hook.result.current.dispatch({ type: "increment" });
    });

    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onLoad).toHaveBeenCalledWith({ count: 4 }, { count: 4 });
  });

  test("throws a structured error when used outside its provider", async () => {
    const store = createCounterStore(createMemoryStorage());

    await expect(renderHook(() => store.useLoad())).rejects.toMatchObject({
      status: "missing_provider",
    });
  });
});
