import {
  createMemoryFileTransfer,
  setFileTransferOverride,
} from "../fileTransfer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as FileSystem from "expo-file-system/legacy";
import { Alert } from "react-native";
import { AnalyticsProvider } from "@/state/analytics";
import { useDatagate } from "../DataGate";
import { useAppData } from "../appData";

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
      appData: useAppData(),
    }),
    { wrapper }
  );

const waitForLoaded = (hook) =>
  waitFor(() => {
    expect(hook.result.current.appData.load.status).toBe("ready");
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

// Presses the confirming (destructive) button of the latest prompt.
const confirmPrompt = () => {
  const buttons = jest.mocked(Alert.alert).mock.lastCall?.[2] ?? [];
  buttons.find((button) => button.style === "destructive")?.onPress?.();
};

// Presses the cancelling button of the latest prompt.
const cancelPrompt = () => {
  const buttons = jest.mocked(Alert.alert).mock.lastCall?.[2] ?? [];
  buttons.find((button) => button.style === "cancel")?.onPress?.();
};

describe("useLogs()", () => {
  beforeEach(() => {
    console.error = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    console.error = _console_error;
    setFileTransferOverride(null);
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
  });

  test("should `openImportDialog`", async () => {
    const hook = await _renderHook();

    jest.spyOn(Alert, "alert");
    setFileTransferOverride(
      createMemoryFileTransfer({
        picked: JSON.stringify({
          items: testItems,
          settings: testSettings,
          tags: testTags,
        }),
      })
    );

    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.datagate.openImportDialog();
    });

    confirmPrompt();

    await waitFor(() => {
      expect(hook.result.current.logState.items).toEqual(testItems);
      expect(hook.result.current.tagsState.tags).toEqual(testTags);
    });

    expect(hook.result.current.logState).toEqual({
      items: testItems,
    });
    expect(hook.result.current.logState.items[1].photos).toEqual([testPhoto]);
    expect(hook.result.current.tagsState).toEqual({
      tags: testTags,
    });
    expect(hook.result.current.settingsState.settings).toEqual({
      ...testSettings,
    });
  });

  test("resolves and keeps data when the import prompt is cancelled", async () => {
    const hook = await _renderHook();
    jest.spyOn(Alert, "alert");
    const fileTransfer = createMemoryFileTransfer({ picked: "{}" });
    const pickJsonText = jest.spyOn(fileTransfer, "pickJsonText");
    setFileTransferOverride(fileTransfer);

    await waitForLoaded(hook);
    await act(() => {
      hook.result.current.logUpdater.import({ items: testItems });
    });

    let dialog: Promise<void> | undefined;
    await act(() => {
      dialog = hook.result.current.datagate.openImportDialog();
    });
    await act(() => {
      cancelPrompt();
    });

    await expect(dialog).resolves.toBeUndefined();
    expect(pickJsonText).not.toHaveBeenCalled();
    expect(hook.result.current.logState.items).toEqual(testItems);
  });

  test("resolves and keeps data when the reset prompt is cancelled", async () => {
    const hook = await _renderHook();
    jest.spyOn(Alert, "alert");

    await waitForLoaded(hook);
    await act(() => {
      hook.result.current.logUpdater.import({ items: testItems });
    });

    let dialog: Promise<void> | undefined;
    await act(() => {
      dialog = hook.result.current.datagate.openResetDialog();
    });
    await act(() => {
      cancelPrompt();
    });

    await expect(dialog).resolves.toBeUndefined();
    expect(hook.result.current.logState.items).toEqual(testItems);
  });

  test("keeps data when the picked file is not a Pixy export", async () => {
    const hook = await _renderHook();
    jest.spyOn(Alert, "alert");
    setFileTransferOverride(
      createMemoryFileTransfer({ picked: '{"items": "nope"}' })
    );

    await waitForLoaded(hook);
    await act(() => {
      hook.result.current.logUpdater.import({ items: testItems });
    });
    await act(() => {
      hook.result.current.datagate.openImportDialog();
    });
    await act(() => Promise.resolve(confirmPrompt()));

    expect(hook.result.current.logState.items).toEqual(testItems);
  });

  test("should `openExportDialog`", async () => {
    const hook = await _renderHook();
    const fileTransfer = createMemoryFileTransfer();
    setFileTransferOverride(fileTransfer);

    await waitForLoaded(hook);

    await act(() => {
      hook.result.current.tagsUpdater.import({ tags: testTags });
      hook.result.current.logUpdater.import({ items: testItems });
      hook.result.current.settingsState.importSettings(testSettings);
    });

    await act(async () => {
      await hook.result.current.datagate.openExportDialog({ format: "json" });
    });

    expect(fileTransfer.shared).toHaveLength(1);
    const [{ filename, contents }] = fileTransfer.shared;
    expect(filename).toMatch(/^pixy-mood-tracker-.*\.json$/u);
    expect(JSON.parse(contents)).toEqual({
      version: pkg.version,
      items: testItems,
      settings: _.omit(testSettings, [
        "deviceId",
        "storeReviewPromptedAt",
        "storeReviewPromptedAppVersion",
        "photosDayAccessDismissed",
        "colorScheme",
        "locationEnabled",
        "calendarLayout",
      ]) satisfies ExportSettings,
      tags: testTags,
      people: [],
    });
    // Metadata only: export files never contain photo files.
    expect(JSON.parse(contents).items[1].photos).toEqual([testPhoto]);
  });

  test("exports CSV entries", async () => {
    const hook = await _renderHook();
    const fileTransfer = createMemoryFileTransfer();
    setFileTransferOverride(fileTransfer);

    await waitForLoaded(hook);
    await act(() => {
      hook.result.current.logUpdater.import({ items: testItems });
    });
    await act(async () => {
      await hook.result.current.datagate.openExportDialog({ format: "csv" });
    });

    const [{ filename, contents }] = fileTransfer.shared;
    expect(filename).toMatch(/\.csv$/u);
    expect(contents).toContain('"test message"');
    expect(contents).toContain('"🦄"');
  });

  test("shows recovery guidance when sharing is unavailable", async () => {
    const hook = await _renderHook();
    setFileTransferOverride(
      createMemoryFileTransfer({ isShareAvailable: false })
    );
    const alert = jest.spyOn(Alert, "alert");

    await waitForLoaded(hook);
    await act(async () => {
      await hook.result.current.datagate.openExportDialog({ format: "csv" });
    });

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

    confirmPrompt();

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
      items: [],
    });
    expect(hook.result.current.tagsState).toEqual({
      tags: expect.arrayContaining([
        expect.objectContaining({ id: "1" }),
        expect.objectContaining({ id: "18" }),
      ]),
    });
    expect(hook.result.current.settingsState.settings).toEqual({
      ...INITIAL_STATE,
      deviceId: expect.any(String),
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
    const fileTransfer = createMemoryFileTransfer();
    setFileTransferOverride(fileTransfer);

    await waitForLoaded(hook);
    await act(() => {
      hook.result.current.peopleUpdater.import({ people: testPeople });
      hook.result.current.logUpdater.import({ items: testItems });
    });
    await act(async () => {
      await hook.result.current.datagate.openExportDialog({ format: "json" });
    });

    const exported = JSON.parse(fileTransfer.shared[0].contents);
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
      items: testItems,
    });

    expect(hook.result.current.tagsState).toEqual({
      tags: testTags,
    });

    expect(hook.result.current.settingsState.settings).toEqual({
      ...testSettings,
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
