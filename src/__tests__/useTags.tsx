import AsyncStorage from "@react-native-async-storage/async-storage";
import { renderHook, act } from "@testing-library/react-hooks";
import { AnalyticsProvider } from "../hooks/useAnalytics";
import {
  LogsProvider,
  useLogState,
  STORAGE_KEY as STORAGE_KEY_LOGS,
  LogsState,
} from "../hooks/useLogs";
import {
  SettingsProvider,
  useSettings,
  STORAGE_KEY as STORAGE_KEY_SETTINGS,
  INITIAL_STATE as INITIAL_STATE_SETTINGS,
} from "../hooks/useSettings";

import {
  STORAGE_KEY as STORAGE_KEY_TAGS,
  Tag,
  TagsProvider,
  useTagsState,
  useTagsUpdater,
} from "../hooks/useTags";
import { _generateItem } from "./utils";

const wrapper = ({ children }) => (
  <SettingsProvider>
    <AnalyticsProvider>
      <LogsProvider>
        <TagsProvider>{children}</TagsProvider>
      </LogsProvider>
    </AnalyticsProvider>
  </SettingsProvider>
);

const _renderHook = () => {
  return renderHook(
    () => ({
      state: useTagsState(),
      updater: useTagsUpdater(),
      settings: useSettings(),
      logsState: useLogState(),
    }),
    { wrapper }
  );
};

const testTags: Tag[] = [
  {
    id: "1",
    title: "test1",
    color: "slate",
  },
  {
    id: "2",
    title: "test2",
    color: "lime",
  },
];

const testItems: LogsState['items'] = [
  _generateItem({
    date: '2022-01-01',
    rating: 'neutral',
    message: 'test message',
    tags: [...testTags],
  }),
  _generateItem({
    date: '2022-01-02',
    rating: 'neutral',
    message: '🦄',
    tags: [...testTags],
  })
]

describe("useTags()", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("should have `loaded` prop", async () => {
    let hook = _renderHook();
    expect(hook.result.current.state.loaded).toBe(false);
    await hook.waitForNextUpdate();
    expect(hook.result.current.state.loaded).toBe(true);
  });

  test("should load from tags async storage", async () => {
    const _testTags = [...testTags, {
      id: "3",
      title: "test3",
      color: "slate",
    }];

    AsyncStorage.setItem(STORAGE_KEY_TAGS, JSON.stringify({ tags: _testTags }));
    let hook = _renderHook();
    await hook.waitForNextUpdate();
    expect(hook.result.current.state.tags).toEqual(_testTags);
    expect(await AsyncStorage.getItem(STORAGE_KEY_TAGS)).toEqual(JSON.stringify({ tags: _testTags }));
  });

  test("should load from settings (if tags async storage is empty)", async () => {
    const _testTags = [...testTags, {
      id: "4",
      title: "test4",
      color: "orange",
    }];

    AsyncStorage.setItem(
      STORAGE_KEY_SETTINGS,
      JSON.stringify({
        ...INITIAL_STATE_SETTINGS,
        tags: _testTags,
      })
    );
    let hook = _renderHook();
    await hook.waitForNextUpdate();
    expect(hook.result.current.state.tags).toEqual(_testTags);
    expect(await AsyncStorage.getItem(STORAGE_KEY_TAGS)).toEqual(JSON.stringify({ tags: _testTags }));
  });

  test("should initialize (when tags async storage and settings async storage are empty)", async () => {
    let hook = _renderHook();
    await hook.waitForNextUpdate();
    expect(hook.result.current.state.tags.length).toEqual(18);
    expect(hook.result.current.state.tags[0].color).toEqual("slate");
  });

  test("should createTag", async () => {
    let hook = _renderHook();
    await hook.waitForNextUpdate();

    await act(() => {
      hook.result.current.updater.createTag({
        id: "1",
        title: "test",
        color: "red",
      });
    });

    expect(hook.result.current.state.tags.length).toBe(19);
    expect(hook.result.current.state.tags[18].title).toBe("test");
  });

  test("should updateTag", async () => {
    AsyncStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify({ items: testItems }));

    let hook = _renderHook();
    await hook.waitForNextUpdate();

    await act(() => {
      hook.result.current.updater.updateTag({
        id: "1",
        title: "test",
        color: "blue",
      });
    });

    expect(hook.result.current.state.tags.length).toBe(18);
    expect(hook.result.current.state.tags[0].title).toBe("test");
  });

  test("should deleteTag", async () => {
    AsyncStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify({ items: testItems }));

    let hook = _renderHook();
    await hook.waitForNextUpdate();

    await act(() => {
      hook.result.current.updater.deleteTag("1");
    });

    Object.values(hook.result.current.logsState.items).forEach(item => {
      expect(item.tags!.length).toBe(1);
    })
  });

  test("should reset", async () => {
    AsyncStorage.setItem(STORAGE_KEY_TAGS, JSON.stringify({ tags: testTags }));

    let hook = _renderHook();
    await hook.waitForNextUpdate();

    expect(hook.result.current.state.tags.length).toBe(2);
    expect(hook.result.current.state.tags[0].title).toBe("test1");

    await act(() => {
      hook.result.current.updater.reset();
    });

    expect(hook.result.current.state.tags.length).toBe(18);
    expect(hook.result.current.state.tags[0].color).toBe("slate");
  })

  test("should save to async storage", async () => {
    let hook = _renderHook();
    await hook.waitForNextUpdate();

    await act(() => {
      hook.result.current.updater.createTag({
        id: "1",
        title: "test",
        color: "red",
      });
    });

    const json = await AsyncStorage.getItem(STORAGE_KEY_TAGS)
    expect(JSON.parse(json!)).toEqual({
      tags: hook.result.current.state.tags,
    });
  })

  test("should import", async () => {
    let hook = _renderHook();
    await hook.waitForNextUpdate();

    await act(() => {
      hook.result.current.updater.import({
        tags: testTags,
      });
    });

    expect(hook.result.current.state.tags.length).toBe(2);
    expect(hook.result.current.state.tags[0].title).toBe("test1");
  })
});
