import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as FileSystem from "expo-file-system/legacy";
import { _generateItem } from "@/__tests__/utils";
import {
  LogsProvider,
  useLogLoad,
  useLogState,
  useLogUpdater,
} from "@/features/logs";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";
import {
  PeopleProvider,
  STORAGE_KEY,
  usePeopleLoad,
  usePeopleState,
  usePeopleUpdater,
} from "../PeopleProvider";
import type { Person } from "../PeopleProvider";

const wrapper = ({ children }) => (
  <SettingsProvider>
    <AnalyticsProvider>
      <LogsProvider>
        <PeopleProvider>{children}</PeopleProvider>
      </LogsProvider>
    </AnalyticsProvider>
  </SettingsProvider>
);

const _renderHook = () =>
  renderHook(
    () => ({
      state: usePeopleState(),
      updater: usePeopleUpdater(),
      load: usePeopleLoad(),
      logsState: useLogState(),
      logsLoad: useLogLoad(),
      logsUpdater: useLogUpdater(),
    }),
    { wrapper }
  );

const waitForLoaded = (hook) =>
  waitFor(() => {
    expect(hook.result.current.load.status).toBe("ready");
    expect(hook.result.current.logsLoad.status).toBe("ready");
  });

const sam: Person = {
  id: "4b4b4b4b-0000-4000-8000-000000000001",
  name: "Sam",
  avatar: "people/4b4b4b4b-0000-4000-8000-000000000001.jpg",
  createdAt: "2026-01-01T00:00:00.000Z",
};
const alex: Person = {
  id: "4b4b4b4b-0000-4000-8000-000000000002",
  name: "Alex",
  avatar: null,
  createdAt: "2026-01-02T00:00:00.000Z",
};

describe("usePeople()", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(FileSystem, "deleteAsync").mockResolvedValue();
    jest.spyOn(FileSystem, "readDirectoryAsync").mockResolvedValue([]);
    jest.spyOn(FileSystem, "getInfoAsync").mockResolvedValue({
      exists: true,
      isDirectory: true,
      uri: "",
      size: 0,
      modificationTime: 0,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("starts empty when storage is empty", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);
    expect(hook.result.current.state.people).toEqual([]);
    expect(hook.result.current.load.status).toBe("ready");
  });

  test("loads stored people and drops entries without id or name", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        people: [sam, { id: "broken" }, { ...alex, avatar: 42 }],
      })
    );
    const hook = await _renderHook();
    await waitForLoaded(hook);
    expect(hook.result.current.state.people).toEqual([
      sam,
      { ...alex, avatar: null },
    ]);
  });

  test("persists after add, edit, and delete", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);

    await act(() => hook.result.current.updater.createPerson(sam));
    await act(() =>
      hook.result.current.updater.updatePerson({ ...sam, name: "Samuel" })
    );
    await waitFor(async () => {
      expect(await AsyncStorage.getItem(STORAGE_KEY)).toEqual(
        JSON.stringify({ people: [{ ...sam, name: "Samuel" }] })
      );
    });

    await act(() => hook.result.current.updater.deletePerson(sam.id));
    expect(hook.result.current.state.people).toEqual([]);
  });

  test("delete strips the person from entries and removes the avatar file", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);
    const item = _generateItem({
      date: "2026-01-05",
      people: [{ id: sam.id }, { id: alex.id }],
    });

    await act(() => {
      hook.result.current.updater.createPerson(sam);
      hook.result.current.updater.createPerson(alex);
      hook.result.current.logsUpdater.addLog(item);
    });
    await act(() => hook.result.current.updater.deletePerson(sam.id));

    expect(hook.result.current.logsState.items[0].people).toEqual([
      { id: alex.id },
    ]);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      `${FileSystem.documentDirectory}${sam.avatar}`,
      { idempotent: true }
    );
  });

  test("reset clears people and the avatar folder", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);
    await act(() => hook.result.current.updater.createPerson(sam));
    await act(() => hook.result.current.updater.reset());

    expect(hook.result.current.state.people).toEqual([]);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      `${FileSystem.documentDirectory}people/`,
      { idempotent: true }
    );
  });

  test("sweeps avatar files without a person on load", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ people: [sam] }));
    jest
      .spyOn(FileSystem, "readDirectoryAsync")
      .mockResolvedValue([`${sam.id}.jpg`, "orphan.jpg"]);

    const hook = await _renderHook();
    await waitForLoaded(hook);

    await waitFor(() => {
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        `${FileSystem.documentDirectory}people/orphan.jpg`,
        { idempotent: true }
      );
    });
    expect(FileSystem.deleteAsync).not.toHaveBeenCalledWith(
      `${FileSystem.documentDirectory}${sam.avatar}`,
      { idempotent: true }
    );
  });
});
