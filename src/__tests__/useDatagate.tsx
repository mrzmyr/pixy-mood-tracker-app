import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook } from "@testing-library/react-hooks";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert } from 'react-native';
import { AnalyticsProvider } from "../hooks/useAnalytics";
import { useDatagate } from "../hooks/useDatagate";

import _ from "lodash";
import {
  LogsProvider,
  LogsState, useLogState,
  useLogUpdater
} from "../hooks/useLogs";
import { ExportSettings, INITIAL_STATE, SettingsProvider, useSettings } from "../hooks/useSettings";
import { Tag, TagsProvider, useTagsState, useTagsUpdater } from "../hooks/useTags";
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
        id: "bb65f208-4e4c-11ed-bdc3-0242ac120002",
      },
      {
        id: "bb65f208-4e4c-11ed-bdc3-0242ac120002",
      },
    ],
  })
];

const initalTags = [
  {
    "color": "orange",
    "id": "1",
    "title": "Happy 🥳"
  },
  {
    "color": "purple",
    "id": "2",
    "title": "Struggles ☔️"
  },
  {
    "color": "sky",
    "id": "3",
    "title": "Work 💼"
  },
  {
    "color": "green",
    "id": "4",
    "title": "Exercise 🏃"
  },
  {
    "color": "yellow",
    "id": "5",
    "title": "Friends 🤗"
  }
]

const testSettings = {
  ...INITIAL_STATE,
  actionsDone: [{
    title: 'test action',
    date: new Date().toUTCString(),
  }]
}

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

const _renderHook = () => {
  return renderHook(() => ({
    datagate: useDatagate(),
    logState: useLogState(),
    logUpdater: useLogUpdater(),
    tagsState: useTagsState(),
    tagsUpdater: useTagsUpdater(),
    settingsState: useSettings(),
  }), { wrapper });
};

const _console_error = console.error;


jest.mock('react-native-onesignal', () => ({
  removeExternalUserId: jest.fn()
}));

describe("useLogs()", () => {
  beforeEach(async () => {
    console.error = jest.fn();
    jest.resetAllMocks();
  });

  afterEach(async () => {
    console.error = _console_error;
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
  });

  test("should `openImportDialog`", async () => {
    const hook = _renderHook();

    jest.spyOn(Alert, 'alert');
    jest.spyOn(DocumentPicker, 'getDocumentAsync').mockResolvedValueOnce({
      type: 'success',
      uri: 'file://something.json',
      name: '1b1b1b1b-1b1b-1b1b-1b1b-1b1b1b1b1b1b.json',
      size: 0
    });
    jest.spyOn(FileSystem, 'readAsStringAsync').mockResolvedValueOnce(JSON.stringify({
      items: testItems,
      settings: testSettings,
      tags: testTags
    }));

    await hook.waitForNextUpdate();

    await act(() => {
      hook.result.current.datagate.openImportDialog();
    })

    // @ts-ignore
    Alert.alert.mock.calls[0][2][0].onPress()

    await hook.waitForNextUpdate();

    expect(Alert.alert).toBeCalled();
    expect(hook.result.current.logState).toEqual({
      loaded: true,
      items: testItems,
    });
    expect(hook.result.current.tagsState).toEqual({
      loaded: true,
      tags: testTags
    });
    expect(hook.result.current.settingsState.settings).toEqual({
      ...testSettings,
      loaded: true,
    });
  });

  test("should `openExportDialog`", async () => {
    const hook = _renderHook();

    jest.spyOn(Alert, 'alert');
    // @ts-ignore
    jest.spyOn(FileSystem, 'writeAsStringAsync').mockResolvedValueOnce('file://something.json');
    jest.spyOn(Sharing, 'shareAsync');

    await hook.waitForNextUpdate();

    await act(() => {
      hook.result.current.tagsUpdater.import({ tags: testTags });
      hook.result.current.logUpdater.import({ items: testItems });
      hook.result.current.settingsState.importSettings(testSettings);
    });

    await act(() => {
      hook.result.current.datagate.openExportDialog();
    })

    // @ts-ignore
    const calledJson = FileSystem.writeAsStringAsync.mock.calls[0][1];
    const expectedJson = {
      version: '1.0.0',
      items: testItems,
      settings: _.omit(testSettings, ['loaded', 'deviceId']) as ExportSettings,
      tags: testTags
    }

    expect(FileSystem.writeAsStringAsync).toBeCalled()
    expect(JSON.parse(calledJson)).toEqual(expectedJson);
    expect(Sharing.shareAsync).toBeCalledWith(expect.any(String))
  })

  test("should `openResetDialog` with type `factory`", async () => {
    const hook = _renderHook();

    jest.spyOn(Alert, 'alert');

    await hook.waitForNextUpdate();

    await act(() => {
      hook.result.current.tagsUpdater.import({ tags: testTags });
      hook.result.current.logUpdater.import({ items: testItems });
      hook.result.current.settingsState.importSettings(testSettings);
    });

    await act(() => {
      hook.result.current.datagate.openResetDialog('factory');
    })

    // @ts-ignore
    Alert.alert.mock.calls[0][2][0].onPress()

    await hook.waitForNextUpdate();

    expect(Alert.alert).toBeCalled();
    expect(hook.result.current.logState).toEqual({
      loaded: true,
      items: []
    });
    expect(hook.result.current.tagsState).toEqual({
      loaded: true,
      tags: initalTags
    });
    expect(hook.result.current.settingsState.settings).toEqual({
      ...INITIAL_STATE,
      deviceId: expect.any(String),
      loaded: true,
    });
  })

  test("should `openResetDialog` with type `data`", async () => {
    const hook = _renderHook();

    jest.spyOn(Alert, 'alert');

    await hook.waitForNextUpdate();

    await act(() => {
      hook.result.current.tagsUpdater.import({ tags: testTags });
      hook.result.current.logUpdater.import({ items: testItems });
      hook.result.current.settingsState.importSettings(testSettings);
    });

    await act(() => {
      hook.result.current.datagate.openResetDialog('data');
    })

    // @ts-ignore
    Alert.alert.mock.calls[0][2][0].onPress()

    await hook.waitForNextUpdate();

    expect(Alert.alert).toBeCalled();
    expect(hook.result.current.logState).toEqual({
      loaded: true,
      items: []
    });

    expect(hook.result.current.tagsState).toEqual({
      loaded: true,
      tags: initalTags
    });

    expect(hook.result.current.settingsState.settings).toEqual({
      ...testSettings,
      loaded: true,
    });
  })

  test.only("should `import`", async () => {
    const hook = _renderHook();

    await hook.waitForNextUpdate();

    await act(() => {
      hook.result.current.datagate.import({
        version: '1.0.0',
        items: testItems,
        settings: testSettings,
        tags: testTags
      }, { muted: false });
    });

    expect(hook.result.current.logState).toEqual({
      loaded: true,
      items: testItems,
    });

    expect(hook.result.current.tagsState).toEqual({
      loaded: true,
      tags: testTags
    });

    expect(hook.result.current.settingsState.settings).toEqual({
      ...testSettings,
      loaded: true,
    });
  })

});
