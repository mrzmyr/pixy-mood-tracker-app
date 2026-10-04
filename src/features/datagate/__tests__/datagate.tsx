import { setFileTransferOverride } from "../fileTransfer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import { AnalyticsProvider } from "@/state/analytics";
import { useDatagate } from "../DataGate";

import _ from "lodash";
import { LogsProvider, useLogState, useLogUpdater } from "@/features/logs";
import type { LogsState } from "@/features/logs";

import { SettingsProvider, useSettings } from "@/state/settings";
import type { ExportSettings } from "@/state/settings";
import { INITIAL_STATE } from "@/constants/Settings";

import { TagsProvider, useTagsState, useTagsUpdater } from "@/features/tags";
import type { Tag } from "@/features/tags";
import {
  PeopleProvider,
  usePeopleState,
  usePeopleUpdater,
} from "@/features/people";
import type { Person } from "@/features/people";

import { _generateItem } from "@/__tests__/utils";
import { File } from "expo-file-system";
import { getPhotosDirectory } from "@/features/photos";
import pkg from "../../../../package.json";

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-sharing is a native module unavailable in Jest; the export test asserts on shareAsync
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

const wrapper = ({ children }) => (
  <SettingsProvider>
    <AnalyticsProvider>
      <LogsProvider>
        <TagsProvider>
          <PeopleProvider>{children}</PeopleProvider>
        </TagsProvider>
      </LogsProvider>
    </AnalyticsProvider>
  </SettingsProvider>
);

const testPhoto = {
  id: "8f8a7d3e-6c1f-4f59-9a52-2c9a5d1e7b10",
  fileName: "8f8a7d3e-6c1f-4f59-9a52-2c9a5d1e7b10.jpg",
  width: 1536,
  height: 2048,
  createdAt: "2022-01-02T10:00:00.000Z",
  source: "library" as const,
};

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
    photos: [testPhoto],
  }),
];

const testSettings = {
  ...INITIAL_STATE,
  actionsDone: [
    {
      title: "test action",
      date: new Date().toUTCString(),
    },
  ],
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

const _renderHook = () =>
  renderHook(
    () => ({
      datagate: useDatagate(),
      logState: useLogState(),
      logUpdater: useLogUpdater(),
      tagsState: useTagsState(),
      tagsUpdater: useTagsUpdater(),
      peopleState: usePeopleState(),
      peopleUpdater: usePeopleUpdater(),
      settingsState: useSettings(),
    }),
    { wrapper }
  );

const waitForLoaded = (hook) =>
  waitFor(() => {
    expect(hook.result.current.logState.loaded).toBe(true);
    expect(hook.result.current.tagsState.loaded).toBe(true);
    expect(hook.result.current.peopleState.loaded).toBe(true);
    expect(hook.result.current.settingsState.settings.loaded).toBe(true);
  });

const testPeople: Person[] = [
  {
    id: "4b4b4b4b-0000-4000-8000-000000000001",
    name: "Sam",
    avatar: "people/4b4b4b4b-0000-4000-8000-000000000001.jpg",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "4b4b4b4b-0000-4000-8000-000000000002",
    name: "Alex",
    avatar: null,
    isArchived: true,
    createdAt: "2026-01-02T00:00:00.000Z",
  },
];

const _console_error = console.error;

describe("useLogs()", () => {
  beforeEach(() => {
    console.error = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    console.error = _console_error;
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
  });

  test("should `openImportDialog`", async () => {
    const hook = await _renderHook();

    jest.spyOn(Alert, "alert");
    jest.spyOn(DocumentPicker, "getDocumentAsync").mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: "file://something.json",
          name: "1b1b1b1b-1b1b-1b1b-1b1b-1b1b1b1b1b1b.json",
          size: 0,
          lastModified: 0,
        },
      ],
    });
    jest.spyOn(FileSystem, "readAsStringAsync").mockResolvedValueOnce(
      JSON.stringify({
        items: testItems,
        settings: testSettings,
        tags: testTags,
      })
    );

    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.datagate.openImportDialog();
    });

    jest.mocked(Alert.alert).mock.calls[0]?.[2]?.[0]?.onPress?.();

    await waitFor(() => {
      expect(hook.result.current.logState.items).toEqual(testItems);
      expect(hook.result.current.tagsState.tags).toEqual(testTags);
    });

    expect(Alert.alert).toBeCalled();
    expect(hook.result.current.logState).toEqual({
      loaded: true,
      items: testItems,
    });
    expect(hook.result.current.logState.items[1].photos).toEqual([testPhoto]);
    expect(hook.result.current.tagsState).toEqual({
      loaded: true,
      tags: testTags,
    });
    expect(hook.result.current.settingsState.settings).toEqual({
      ...testSettings,
      // Imports keep this phone's identity.
      deviceId: expect.any(String),
      loaded: true,
    });
  });

  test("should `openExportDialog`", async () => {
    const hook = await _renderHook();

    jest.spyOn(Alert, "alert");
    jest.spyOn(FileSystem, "writeAsStringAsync").mockResolvedValueOnce();
    jest.spyOn(FileSystem, "readDirectoryAsync").mockResolvedValue([]);
    jest.spyOn(FileSystem, "deleteAsync").mockResolvedValue();
    jest.mocked(Sharing.shareAsync).mockClear();

    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.tagsUpdater.import({ tags: testTags });
      hook.result.current.logUpdater.import({ items: testItems });
      hook.result.current.settingsState.importSettings(testSettings);
    });

    await act(async () => {
      await hook.result.current.datagate.openExportDialog({ format: "json" });
    });

    const [calledUri, calledJson = ""] =
      jest.mocked(FileSystem.writeAsStringAsync).mock.calls[0] ?? [];
    const expectedJson = {
      version: pkg.version,
      items: testItems,
      settings: _.omit(testSettings, [
        "loaded",
        "deviceId",
        "backupEnabled",
        "backupWrittenAt",
        "storeReviewPromptedAt",
        "storeReviewPromptedAppVersion",
        "photosDayAccessDismissed",
      ]) satisfies ExportSettings,
      tags: testTags,
      people: [],
    };

    expect(calledUri).toMatch(
      new RegExp(
        `^${FileSystem.cacheDirectory}pixy-mood-tracker-.*\\.json$`,
        "u"
      )
    );
    expect(JSON.parse(calledJson)).toEqual(expectedJson);
    // Metadata only: export files never contain photo files.
    expect(JSON.parse(calledJson).items[1].photos).toEqual([testPhoto]);
    expect(Sharing.shareAsync).toBeCalledWith(calledUri, {
      mimeType: "application/json",
      UTI: "public.json",
    });
  });

  test("`openExportDialog` uses the file transfer override", async () => {
    const hook = await _renderHook();
    const share = jest.fn(() => Promise.resolve(true));
    setFileTransferOverride({ share, pickJson: () => Promise.resolve(null) });
    jest.spyOn(FileSystem, "writeAsStringAsync").mockResolvedValueOnce();
    jest.spyOn(FileSystem, "readDirectoryAsync").mockResolvedValue([]);
    jest.spyOn(FileSystem, "deleteAsync").mockResolvedValue();
    jest.mocked(Sharing.shareAsync).mockClear();

    await waitForLoaded(hook);
    await act(async () => {
      await hook.result.current.datagate.openExportDialog({ format: "json" });
    });
    setFileTransferOverride(null);

    expect(share).toBeCalledWith(expect.stringMatching(/\.json$/u));
    expect(Sharing.shareAsync).not.toBeCalled();
  });

  test("exports CSV entries with the spreadsheet MIME type", async () => {
    const hook = await _renderHook();
    jest.spyOn(FileSystem, "writeAsStringAsync").mockResolvedValue();
    jest.spyOn(FileSystem, "readDirectoryAsync").mockResolvedValue([]);
    jest.spyOn(FileSystem, "deleteAsync").mockResolvedValue();

    await waitForLoaded(hook);
    await act(() => {
      hook.result.current.logUpdater.import({ items: testItems });
    });
    await act(async () => {
      await hook.result.current.datagate.openExportDialog({ format: "csv" });
    });

    const [[uri, contents]] = jest.mocked(FileSystem.writeAsStringAsync).mock
      .calls;
    expect(uri).toMatch(/\.csv$/u);
    expect(contents).toContain('"note","sleep_quality"');
    expect(contents).toContain('"test message"');
    expect(contents).toContain('"🦄"');
    expect(Sharing.shareAsync).toHaveBeenCalledWith(uri, {
      mimeType: "text/csv",
      UTI: "public.comma-separated-values-text",
    });
  });

  test("shows recovery guidance when sharing is unavailable", async () => {
    const hook = await _renderHook();
    setFileTransferOverride({
      share: () => Promise.resolve(false),
      pickJson: () => Promise.resolve(null),
    });
    jest.spyOn(FileSystem, "writeAsStringAsync").mockResolvedValue();
    jest.spyOn(FileSystem, "readDirectoryAsync").mockResolvedValue([]);
    jest.spyOn(FileSystem, "deleteAsync").mockResolvedValue();
    const alert = jest.spyOn(Alert, "alert");

    await waitForLoaded(hook);
    await act(async () => {
      await hook.result.current.datagate.openExportDialog({ format: "csv" });
    });
    setFileTransferOverride(null);

    expect(alert).toHaveBeenCalledWith(
      "Export failed",
      "Check available device storage and try exporting again."
    );
  });

  test("should `openResetDialog` delete entries, tags, people, and settings", async () => {
    const hook = await _renderHook();

    jest.spyOn(Alert, "alert");
    jest.spyOn(FileSystem, "deleteAsync").mockResolvedValue();

    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.tagsUpdater.import({ tags: testTags });
      hook.result.current.peopleUpdater.import({ people: testPeople });
      hook.result.current.logUpdater.import({ items: testItems });
      hook.result.current.settingsState.importSettings(testSettings);
    });

    await act(() => {
      hook.result.current.datagate.openResetDialog();
    });

    jest.mocked(Alert.alert).mock.calls[0]?.[2]?.[0]?.onPress?.();

    await waitFor(() => {
      expect(hook.result.current.logState.items).toEqual([]);
      expect(hook.result.current.tagsState.tags).toHaveLength(18);
      expect(hook.result.current.peopleState.people).toEqual([]);
    });
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      `${FileSystem.documentDirectory}people/`,
      { idempotent: true }
    );

    expect(Alert.alert).toBeCalled();
    expect(hook.result.current.logState).toEqual({
      loaded: true,
      items: [],
    });
    expect(hook.result.current.tagsState).toEqual({
      loaded: true,
      tags: expect.arrayContaining([
        expect.objectContaining({ id: "1" }),
        expect.objectContaining({ id: "18" }),
      ]),
    });
    expect(hook.result.current.settingsState.settings).toEqual({
      ...INITIAL_STATE,
      deviceId: expect.any(String),
      loaded: true,
    });
  });

  test("should export people with avatars inline and import them back", async () => {
    const hook = await _renderHook();
    const base64 = "/9j/4AAQSkZJRgABAQAASABIAAD/2wBDAP//////////";

    jest.spyOn(FileSystem, "writeAsStringAsync").mockResolvedValue();
    jest.spyOn(FileSystem, "readDirectoryAsync").mockResolvedValue([]);
    jest.spyOn(FileSystem, "deleteAsync").mockResolvedValue();
    jest.spyOn(FileSystem, "makeDirectoryAsync").mockResolvedValue();
    jest.spyOn(FileSystem, "getInfoAsync").mockResolvedValue({
      exists: true,
      isDirectory: true,
      uri: "",
      size: 0,
      modificationTime: 0,
    });
    jest.spyOn(FileSystem, "readAsStringAsync").mockResolvedValue(base64);
    jest.mocked(Sharing.shareAsync).mockClear();

    await waitForLoaded(hook);
    await act(() => {
      hook.result.current.peopleUpdater.import({ people: testPeople });
      hook.result.current.logUpdater.import({ items: testItems });
    });
    await act(async () => {
      await hook.result.current.datagate.openExportDialog({ format: "json" });
    });

    const exportCall = jest
      .mocked(FileSystem.writeAsStringAsync)
      .mock.calls.find(([uri]) => uri.endsWith(".json"));
    const exported = JSON.parse(exportCall?.[1] ?? "{}");
    expect(exported.people).toEqual([
      { ...testPeople[0], avatar: { base64, mime: "image/jpeg" } },
      { ...testPeople[1], avatar: null },
    ]);

    // Import on a device without the avatar file writes it from the export.
    await act(async () => {
      hook.result.current.peopleUpdater.reset();
      await hook.result.current.datagate.import(exported, { muted: true });
    });

    expect(hook.result.current.peopleState.people).toEqual(testPeople);
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      `${FileSystem.documentDirectory}${testPeople[0].avatar}`,
      base64,
      { encoding: FileSystem.EncodingType.Base64 }
    );
  });

  test("should import people without avatar when the file cannot be written", async () => {
    const hook = await _renderHook();
    jest.spyOn(FileSystem, "makeDirectoryAsync").mockResolvedValue();
    jest.spyOn(FileSystem, "getInfoAsync").mockResolvedValue({
      exists: true,
      isDirectory: true,
      uri: "",
      size: 0,
      modificationTime: 0,
    });
    jest
      .spyOn(FileSystem, "writeAsStringAsync")
      .mockRejectedValue(new Error("disk full"));

    await waitForLoaded(hook);
    await act(async () => {
      await hook.result.current.datagate.import(
        {
          version: "1.0.0",
          items: testItems,
          settings: testSettings,
          tags: testTags,
          people: [
            {
              ...testPeople[0],
              avatar: { base64: "AAAA", mime: "image/jpeg" },
            },
          ],
        },
        { muted: true }
      );
    });

    expect(hook.result.current.peopleState.people).toEqual([
      { ...testPeople[0], avatar: null },
    ]);
  });

  test("should `import`", async () => {
    const hook = await _renderHook();

    await waitForLoaded(hook);

    await act(async () => {
      await hook.result.current.datagate.import(
        {
          version: "1.0.0",
          items: testItems,
          settings: testSettings,
          tags: testTags,
        },
        { muted: false }
      );
    });

    expect(hook.result.current.logState).toEqual({
      loaded: true,
      items: testItems,
    });

    expect(hook.result.current.tagsState).toEqual({
      loaded: true,
      tags: testTags,
    });

    expect(hook.result.current.settingsState.settings).toEqual({
      ...testSettings,
      // Imports keep this phone's identity.
      deviceId: expect.any(String),
      loaded: true,
    });
  });

  test("keeps photo files of entries missing from the backup after `import`", async () => {
    const hook = await _renderHook();
    await waitForLoaded(hook);
    // After the sweep on load, which would delete it first.
    await act(async () => {});
    const directory = getPhotosDirectory();
    directory.create({ idempotent: true, intermediates: true });
    const photoFile = new File(directory, "not-in-backup.jpg");
    photoFile.create();

    await act(() => {
      hook.result.current.datagate.import(
        {
          version: "1.0.0",
          items: testItems,
          settings: testSettings,
          tags: testTags,
        },
        { muted: true }
      );
    });

    await act(async () => {});
    expect(hook.result.current.logState.items).toEqual(testItems);
    expect(photoFile.exists).toBe(true);
    photoFile.delete();
  });
});
