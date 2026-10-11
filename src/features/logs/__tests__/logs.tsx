import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AnalyticsProvider } from "@/state/analytics";
import {
  LogsProvider,
  STORAGE_KEY,
  useLogLoad,
  useLogState,
  useLogUpdater,
} from "../LogsProvider";
import type { LogsState } from "../LogsProvider";

import { SettingsProvider } from "@/state/settings";
import { _generateItem } from "@/__tests__/utils";
import { File } from "expo-file-system";
import { getPhotosDirectory } from "@/features/photos";
import omit from "lodash/omit";

const wrapper = ({ children }) => (
  <SettingsProvider>
    <AnalyticsProvider>
      <LogsProvider>{children}</LogsProvider>
    </AnalyticsProvider>
  </SettingsProvider>
);

const testItems: LogsState["items"] = [
  _generateItem({
    date: "2022-01-01",
    rating: "neutral",
    message: "test message",
    tags: [],
  }),
  _generateItem({
    date: "2022-01-02",
    rating: "neutral",
    message: "🦄",
    tags: [
      {
        id: "1",
      },
      {
        id: "2",
      },
    ],
  }),
];

const _renderHook = () =>
  renderHook(
    () => ({
      state: useLogState(),
      updater: useLogUpdater(),
      load: useLogLoad(),
    }),
    { wrapper }
  );

const waitForLoaded = (hook) =>
  waitFor(() => {
    expect(hook.result.current.load.status).toBe("ready");
  });

const countLogSaves = () =>
  jest
    .mocked(AsyncStorage.setItem)
    .mock.calls.filter(([key]) => key === STORAGE_KEY).length;

const createPhotoFile = (fileName: string) => {
  const directory = getPhotosDirectory();
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, fileName);
  file.create();
  return file;
};

const storedPhoto = {
  id: "8f8a7d3e-6c1f-4f59-9a52-2c9a5d1e7b10",
  fileName: "8f8a7d3e-6c1f-4f59-9a52-2c9a5d1e7b10.jpg",
  width: 1536,
  height: 2048,
  createdAt: "2026-01-01T00:00:00.000Z",
  source: "library" as const,
};

const _console_error = console.error;

describe("useLogs()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    const photosDirectory = getPhotosDirectory();
    if (photosDirectory.exists) {
      photosDirectory.delete();
    }
  });

  afterEach(async () => {
    console.error = _console_error;
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
    jest.restoreAllMocks();
  });

  test("should load `state` from async storage", async () => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items: testItems }));

    const hook = await _renderHook();
    await waitForLoaded(hook);

    expect(hook.result.current.state.items).toEqual(testItems);
  });

  test("should keep already migrated entries when loading", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        items: [
          testItems[0],
          { ...testItems[1], tags: [{ id: "1", title: "legacy" }] },
        ],
      })
    );

    const hook = await _renderHook();
    await waitForLoaded(hook);

    expect(hook.result.current.state.items).toEqual([
      testItems[0],
      { ...testItems[1], tags: [{ id: "1" }] },
    ]);
  });

  test("should migrate entries with null tag references", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ items: [{ ...testItems[0], tags: [null] }] })
    );

    const hook = await _renderHook();
    await waitForLoaded(hook);

    expect(hook.result.current.state.items).toEqual([
      { ...testItems[0], tags: [{}] },
    ]);
  });

  test("should add empty people to entries from before the people feature", async () => {
    const { people: _people, ...legacy } = _generateItem({
      id: "legacy-without-people",
      date: "2022-01-01",
    });
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ items: [legacy] })
    );

    const hook = await _renderHook();
    await waitForLoaded(hook);
    const loaded = hook.result.current.state.items.find(
      (item) => item.id === legacy.id
    );
    expect(loaded?.people).toEqual([]);
  });

  test("should migrate entries without photos", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ items: [omit(testItems[0], "photos")] })
    );

    const hook = await _renderHook();
    await waitForLoaded(hook);

    expect(hook.result.current.state.items).toEqual([
      { ...testItems[0], photos: [] },
    ]);
  });

  test("should delete unreferenced photo files after load", async () => {
    const kept = createPhotoFile(storedPhoto.fileName);
    const orphan = createPhotoFile("orphan.jpg");
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ items: [{ ...testItems[0], photos: [storedPhoto] }] })
    );

    const hook = await _renderHook();
    await waitForLoaded(hook);

    await waitFor(() => {
      expect(orphan.exists).toBe(false);
    });
    expect(kept.exists).toBe(true);
  });

  test("should keep photo files when stored logs cannot be parsed", async () => {
    const photo = createPhotoFile(storedPhoto.fileName);
    await AsyncStorage.setItem(STORAGE_KEY, "🐇");

    const hook = await _renderHook();
    await waitFor(() => {
      expect(hook.result.current.load.status).toBe("error");
    });

    await act(() => hook.result.current.updater.sweepPhotos());
    expect(photo.exists).toBe(true);
  });

  test("should delete photo files of a deleted entry on `sweepPhotos`", async () => {
    const photo = createPhotoFile(storedPhoto.fileName);
    const item = { ...testItems[0], photos: [storedPhoto] };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items: [item] }));

    const hook = await _renderHook();
    await waitForLoaded(hook);
    expect(photo.exists).toBe(true);

    await act(() => {
      hook.result.current.updater.deleteLog(item.id);
      hook.result.current.updater.sweepPhotos();
    });

    expect(photo.exists).toBe(false);
  });

  test("should initiate `state` with empty `items` when async storage is empty", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);
    expect(hook.result.current.state.items).toEqual([]);
  });

  test("should import", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.updater.import({
        items: testItems,
      });
    });

    expect(hook.result.current.state.items).toEqual(testItems);
  });

  test("should addLog", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.updater.addLog(testItems[0]);
    });

    expect(hook.result.current.state.items).toEqual([testItems[0]]);
  });

  test("should editLog", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    const itemEdited = {
      ...testItems[0],
      message: "edited message",
      tags: [
        {
          id: "4",
        },
      ],
    };

    await act(() => hook.result.current.updater.addLog(testItems[0]));
    await act(() => hook.result.current.updater.editLog(itemEdited));

    expect(hook.result.current.state.items).toEqual([itemEdited]);
  });

  test("should keep state and skip saving when an edit changes nothing", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => hook.result.current.updater.addLog(testItems[0]));
    const stateBefore = hook.result.current.state;
    const savesBefore = countLogSaves();

    await act(() =>
      hook.result.current.updater.editLog({ ...testItems[0], tags: [] })
    );
    await act(() => hook.result.current.updater.deleteLog("unknown-id"));

    expect(hook.result.current.state).toBe(stateBefore);
    expect(countLogSaves()).toBe(savesBefore);
  });

  test("should updateLogs", async () => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items: [] }));

    const hook = await _renderHook();
    await waitForLoaded(hook);

    const itemsEdited = [
      {
        ...testItems[0],
        message: "edited message",
        tags: [
          {
            id: "1",
          },
        ],
      },
      {
        ...testItems[1],
        message: "edited message 2",
        tags: [
          {
            id: "1",
          },
        ],
      },
    ];

    expect(hook.result.current.state.items).toEqual([]);

    await act(() => hook.result.current.updater.updateLogs(itemsEdited));

    expect(hook.result.current.state.items).toEqual(itemsEdited);
  });

  test("should deleteLog", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => hook.result.current.updater.addLog(testItems[0]));
    await act(() => hook.result.current.updater.addLog(testItems[1]));
    await act(() => hook.result.current.updater.deleteLog(testItems[0].id));

    expect(hook.result.current.state.items).toEqual([testItems[1]]);
  });

  test("should removePersonFromLogs", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);
    const withSam = _generateItem({
      date: "2026-01-01",
      people: [{ id: "sam" }, { id: "alex" }],
    });
    const withoutSam = _generateItem({ date: "2026-01-02", people: [] });

    await act(() =>
      hook.result.current.updater.updateLogs([withSam, withoutSam])
    );
    const before = hook.result.current.state;
    await act(() => hook.result.current.updater.removePersonFromLogs("nobody"));
    expect(hook.result.current.state).toBe(before);

    await act(() => hook.result.current.updater.removePersonFromLogs("sam"));
    expect(hook.result.current.state.items).toEqual([
      { ...withSam, people: [{ id: "alex" }] },
      withoutSam,
    ]);
  });

  test("should reset", async () => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items: [] }));

    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => hook.result.current.updater.updateLogs(testItems));
    expect(hook.result.current.state.items).toEqual(testItems);

    await act(() => hook.result.current.updater.reset());
    expect(hook.result.current.state.items).toEqual([]);
  });
});
