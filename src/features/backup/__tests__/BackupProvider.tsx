import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from "@sentry/react-native";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { Alert } from "react-native";
import { _generateItem } from "@/__tests__/utils";
import { INITIAL_STATE } from "@/constants/Settings";
import {
  LogsProvider,
  STORAGE_KEY as LOGS_KEY,
  useLogLoad,
  useLogState,
} from "@/features/logs";
import { PeopleProvider } from "@/features/people";
import { TagsProvider } from "@/features/tags";
import { AnalyticsProvider } from "@/state/analytics";
import { FeatureFlagsProvider } from "@/state/featureFlags";
import {
  SettingsProvider,
  STORAGE_KEY as SETTINGS_KEY,
  useSettings,
} from "@/state/settings";
import * as cloud from "../cloud";
import { createBackupFile } from "../backupFile";
import type { BackupFile } from "../backupFile";
import {
  AUTO_BACKUP_DELAY_MS,
  BackupProvider,
  useBackup,
} from "../BackupProvider";

// oxlint-disable-next-line anti-slop/no-module-mocking -- cloud.ts is the native boundary (iCloud, Google Drive, Google Sign-In); Jest has none of them
jest.mock("../cloud", () => ({
  getBackupProvider: jest.fn(() => "icloud"),
  connect: jest.fn(() => Promise.resolve(true)),
  resume: jest.fn(() => Promise.resolve(true)),
  disconnect: jest.fn(() => Promise.resolve()),
  isAvailable: jest.fn(() => Promise.resolve(true)),
  readBackupFile: jest.fn(() => Promise.resolve(null)),
  writeBackupFile: jest.fn(() => Promise.resolve()),
  deleteBackupFile: jest.fn(() => Promise.resolve()),
}));

// oxlint-disable-next-line anti-slop/no-module-mocking -- BackupProvider reports through the Sentry SDK imported directly; the test asserts on captureException
jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
}));

// jest.setup.js replaces posthog-react-native with one shared fake client.
const mockReloadFlags = jest.mocked(
  getPostHogTestClient().reloadFeatureFlagsAsync
);

const DEVICE_ID = "this-phone";
/** Onboarding done plus analytics on: consent, so feature flags load. */
const ONBOARDED = [{ title: "onboarding", date: "2026-10-01T10:00:00.000Z" }];

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>
    <AnalyticsProvider>
      <FeatureFlagsProvider options={{ enabled: true }}>
        <LogsProvider>
          <TagsProvider>
            <PeopleProvider>
              <BackupProvider>{children}</BackupProvider>
            </PeopleProvider>
          </TagsProvider>
        </LogsProvider>
      </FeatureFlagsProvider>
    </AnalyticsProvider>
  </SettingsProvider>
);

const seed = async ({
  itemCount,
  backupEnabled = true,
}: {
  itemCount: number;
  backupEnabled?: boolean;
}) => {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      ...INITIAL_STATE,
      deviceId: DEVICE_ID,
      backupEnabled,
      actionsDone: ONBOARDED,
    })
  );
  await AsyncStorage.setItem(
    LOGS_KEY,
    JSON.stringify({
      items: Array.from({ length: itemCount }, (_, index) =>
        _generateItem({ date: `2026-09-${String(index + 1).padStart(2, "0")}` })
      ),
    })
  );
};

const remoteFile = (deviceId: string, itemCount: number): BackupFile =>
  createBackupFile({
    deviceId,
    now: new Date("2026-10-01T10:00:00.000Z"),
    data: {
      version: "1.88.0",
      items: Array.from({ length: itemCount }, (_, index) =>
        _generateItem({ date: `2025-01-${String(index + 1).padStart(2, "0")}` })
      ),
      tags: [],
      people: [],
      // Onboarding done, like every real backup: restoring it keeps consent.
      settings: { ...INITIAL_STATE, actionsDone: ONBOARDED },
    },
  });

/** Sentry reports from the backup, ignoring reports of other providers. */
const backupReports = () =>
  jest
    .mocked(Sentry.captureException)
    .mock.calls.filter(
      ([error]) => error instanceof Error && error.message === "Backup failed"
    );

const renderBackup = async () => {
  const hook = await renderHook(
    () => ({
      backup: useBackup(),
      settings: useSettings(),
      logs: useLogState(),
      logsLoad: useLogLoad(),
    }),
    { wrapper }
  );
  await waitFor(() =>
    expect(hook.result.current.logsLoad.status).toBe("ready")
  );
  return hook;
};

/** Real wait: the provider debounces writes by AUTO_BACKUP_DELAY_MS. */
const waitForAutoBackup = () =>
  act(
    () =>
      // oxlint-disable-next-line promise/avoid-new -- setTimeout has no promise form in this Jest environment
      new Promise<void>((resolve) => {
        setTimeout(resolve, AUTO_BACKUP_DELAY_MS + 300);
      })
  );

/**
 * Runs an action that asks first, and presses the confirm button. The Alert
 * opens synchronously, so the button exists right after the call.
 */
const runConfirmed = (action: () => Promise<void>) =>
  act(async () => {
    const running = action();
    jest.mocked(Alert.alert).mock.calls.at(-1)?.[2]?.[0]?.onPress?.();
    await running;
  });

describe("BackupProvider", () => {
  jest.setTimeout(20_000);

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.mocked(cloud.connect).mockResolvedValue(true);
    jest.mocked(cloud.resume).mockResolvedValue(true);
    jest.mocked(cloud.isAvailable).mockResolvedValue(true);
    jest.mocked(cloud.readBackupFile).mockResolvedValue(null);
    mockReloadFlags.mockResolvedValue({ backup: true });
    jest.spyOn(Alert, "alert");
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("writes a backup with this phone's id after changes", async () => {
    await seed({ itemCount: 2 });
    const hook = await renderBackup();
    await waitFor(() => expect(hook.result.current.backup.status).toBe("idle"));

    await waitForAutoBackup();

    await waitFor(() => expect(cloud.writeBackupFile).toHaveBeenCalledTimes(1));
    const written = JSON.parse(
      jest.mocked(cloud.writeBackupFile).mock.calls[0][0]
    );
    expect(written.deviceId).toBe(DEVICE_ID);
    expect(written.data.items).toHaveLength(2);
    expect(hook.result.current.backup.lastBackupAt).toBe(written.createdAt);
  });

  test("flag off: never reads or writes the cloud", async () => {
    mockReloadFlags.mockResolvedValue({ backup: false });
    await seed({ itemCount: 2 });
    const hook = await renderBackup();
    await waitFor(() => expect(mockReloadFlags).toHaveBeenCalled());

    await waitForAutoBackup();

    expect(hook.result.current.backup.enabled).toBe(false);
    expect(cloud.readBackupFile).not.toHaveBeenCalled();
    expect(cloud.writeBackupFile).not.toHaveBeenCalled();
  });

  test("never writes an empty backup", async () => {
    await seed({ itemCount: 0 });
    const hook = await renderBackup();
    await waitFor(() => expect(hook.result.current.backup.status).toBe("idle"));

    await waitForAutoBackup();

    expect(cloud.writeBackupFile).not.toHaveBeenCalled();
  });

  test("keeps a bigger backup from another phone and offers restore", async () => {
    await seed({ itemCount: 1 });
    jest
      .mocked(cloud.readBackupFile)
      .mockResolvedValue(JSON.stringify(remoteFile("old-phone", 5)));
    const hook = await renderBackup();
    await waitFor(() =>
      expect(hook.result.current.backup.canRestore).toBe(true)
    );

    await waitForAutoBackup();

    expect(cloud.writeBackupFile).not.toHaveBeenCalled();
    expect(hook.result.current.backup.lastBackupAt).toBe(
      "2026-10-01T10:00:00.000Z"
    );
  });

  test("restore replaces local entries with the backup", async () => {
    await seed({ itemCount: 1 });
    jest
      .mocked(cloud.readBackupFile)
      .mockResolvedValue(JSON.stringify(remoteFile("old-phone", 5)));
    const hook = await renderBackup();
    await waitFor(() =>
      expect(hook.result.current.backup.canRestore).toBe(true)
    );

    await runConfirmed(() => hook.result.current.backup.restore());

    await waitFor(() => expect(hook.result.current.logs.items).toHaveLength(5));
  });

  test("after restore, the first write holds the restored data, never the old local data", async () => {
    await seed({ itemCount: 1 });
    jest
      .mocked(cloud.readBackupFile)
      .mockResolvedValue(JSON.stringify(remoteFile("old-phone", 5)));
    const hook = await renderBackup();
    await waitFor(() =>
      expect(hook.result.current.backup.canRestore).toBe(true)
    );

    await runConfirmed(() => hook.result.current.backup.restore());
    await waitForAutoBackup();

    await waitFor(() => expect(cloud.writeBackupFile).toHaveBeenCalled());
    const itemCounts = jest
      .mocked(cloud.writeBackupFile)
      .mock.calls.map(([contents]) => JSON.parse(contents).data.items.length);
    expect(itemCounts).not.toContain(1);
    expect(itemCounts.at(-1)).toBe(5);
    expect(hook.result.current.backup.canRestore).toBe(false);
  });

  test("reads the cloud again before writing and pauses when another phone wrote since", async () => {
    await seed({ itemCount: 3 });
    const hook = await renderBackup();
    await waitFor(() => expect(hook.result.current.backup.status).toBe("idle"));
    await waitForAutoBackup();
    await waitFor(() => expect(cloud.writeBackupFile).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        hook.result.current.settings.settings.backupWrittenAt
      ).not.toBeNull()
    );

    // The other phone writes a smaller, newer backup while this app is open.
    const otherPhone = createBackupFile({
      deviceId: "other-phone",
      now: new Date(Date.now() + 60_000),
      data: remoteFile("other-phone", 1).data,
    });
    jest
      .mocked(cloud.readBackupFile)
      .mockResolvedValue(JSON.stringify(otherPhone));
    await act(() =>
      hook.result.current.settings.setSettings((current) => ({
        ...current,
        steps: current.steps.filter((step) => step !== "feedback"),
      }))
    );
    await waitForAutoBackup();

    expect(cloud.writeBackupFile).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(hook.result.current.backup.canRestore).toBe(true)
    );
    expect(hook.result.current.backup.lastBackupAt).toBe(otherPhone.createdAt);
  });

  test("restore keeps this phone's consent and backup stays on", async () => {
    await seed({ itemCount: 1 });
    const backup = remoteFile("old-phone", 5);
    backup.data.settings = {
      ...backup.data.settings,
      analyticsEnabled: false,
      actionsDone: [],
    };
    jest.mocked(cloud.readBackupFile).mockResolvedValue(JSON.stringify(backup));
    const hook = await renderBackup();
    await waitFor(() =>
      expect(hook.result.current.backup.canRestore).toBe(true)
    );

    await runConfirmed(() => hook.result.current.backup.restore());

    await waitFor(() => expect(hook.result.current.logs.items).toHaveLength(5));
    expect(hook.result.current.settings.settings.analyticsEnabled).toBe(true);
    expect(hook.result.current.settings.settings.actionsDone).toEqual(
      ONBOARDED
    );
    expect(hook.result.current.backup.enabled).toBe(true);
    await waitForAutoBackup();
    await waitFor(() => expect(cloud.writeBackupFile).toHaveBeenCalled());
  });

  test("restore confirmation names both entry counts", async () => {
    await seed({ itemCount: 1 });
    jest
      .mocked(cloud.readBackupFile)
      .mockResolvedValue(JSON.stringify(remoteFile("old-phone", 5)));
    const hook = await renderBackup();
    await waitFor(() =>
      expect(hook.result.current.backup.canRestore).toBe(true)
    );

    await runConfirmed(() => hook.result.current.backup.restore());

    const message =
      jest
        .mocked(Alert.alert)
        .mock.calls.find(([title]) => title === "Restore Backup?")?.[1] ?? "";
    expect(message).toContain("1 entries");
    expect(message).toContain("5 entries");
  });

  test("never replaces a cloud file it cannot parse", async () => {
    await seed({ itemCount: 2 });
    jest
      .mocked(cloud.readBackupFile)
      .mockResolvedValue(JSON.stringify({ pixyBackup: 2, deviceId: "x" }));
    const hook = await renderBackup();
    await waitFor(() =>
      expect(hook.result.current.backup.status).toBe("incompatible")
    );

    await waitForAutoBackup();

    expect(cloud.writeBackupFile).not.toHaveBeenCalled();
    expect(hook.result.current.backup.canRestore).toBe(false);
    expect(backupReports()).toHaveLength(0);
  });

  test("offline pauses backup without a Sentry report", async () => {
    await seed({ itemCount: 2 });
    jest
      .mocked(cloud.resume)
      .mockRejectedValue(
        Object.assign(new Error("No connection"), { status: "backup_offline" })
      );
    const hook = await renderBackup();

    await waitFor(() =>
      expect(hook.result.current.backup.status).toBe("unavailable")
    );
    expect(backupReports()).toHaveLength(0);
  });

  test("reports the same failure to Sentry once per session", async () => {
    await seed({ itemCount: 2 });
    jest.mocked(cloud.writeBackupFile).mockRejectedValue(new Error("disk"));
    const hook = await renderBackup();
    await waitFor(() => expect(hook.result.current.backup.status).toBe("idle"));

    await waitForAutoBackup();
    await waitFor(() =>
      expect(hook.result.current.backup.status).toBe("error")
    );
    await act(() =>
      hook.result.current.settings.setSettings((current) => ({
        ...current,
        steps: current.steps.filter((step) => step !== "feedback"),
      }))
    );
    await waitForAutoBackup();

    await waitFor(() => expect(cloud.writeBackupFile).toHaveBeenCalledTimes(2));
    expect(backupReports()).toHaveLength(1);
    // Sentry drops custom error properties, so the status travels as a tag.
    expect(backupReports()[0][1]).toMatchObject({
      tags: { status: "backup_write_failed" },
    });
  });

  test("turning off asks, deletes the backup, and stores the switch", async () => {
    await seed({ itemCount: 2 });
    const hook = await renderBackup();
    await waitFor(() => expect(hook.result.current.backup.status).toBe("idle"));

    await runConfirmed(() => hook.result.current.backup.setEnabled(false));

    expect(cloud.deleteBackupFile).toHaveBeenCalled();
    expect(cloud.disconnect).toHaveBeenCalled();
    await waitFor(() =>
      expect(hook.result.current.settings.settings.backupEnabled).toBe(false)
    );
    expect(hook.result.current.backup.status).toBe("off");
  });

  test("turning off still turns off when the cloud copy cannot be deleted", async () => {
    await seed({ itemCount: 2 });
    jest
      .mocked(cloud.deleteBackupFile)
      .mockRejectedValue(new Error("The user has not granted access"));
    const hook = await renderBackup();
    await waitFor(() => expect(hook.result.current.backup.status).toBe("idle"));

    await runConfirmed(() => hook.result.current.backup.setEnabled(false));

    await waitFor(() =>
      expect(hook.result.current.settings.settings.backupEnabled).toBe(false)
    );
    expect(hook.result.current.backup.status).toBe("off");
    expect(Alert.alert).toHaveBeenLastCalledWith(
      "Backup Is Off",
      expect.stringContaining("Manage Account Storage"),
      expect.any(Array),
      expect.any(Object)
    );
  });

  test("turning off while signed out still turns off when sign-in is cancelled", async () => {
    await seed({ itemCount: 2 });
    jest.mocked(cloud.resume).mockResolvedValue(false);
    jest.mocked(cloud.connect).mockResolvedValue(false);
    const hook = await renderBackup();
    await waitFor(() =>
      expect(hook.result.current.backup.status).toBe("signedOut")
    );

    await runConfirmed(() => hook.result.current.backup.setEnabled(false));

    expect(cloud.deleteBackupFile).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(hook.result.current.settings.settings.backupEnabled).toBe(false)
    );
    expect(Alert.alert).toHaveBeenLastCalledWith(
      "Backup Is Off",
      expect.any(String),
      expect.any(Array),
      expect.any(Object)
    );
  });

  test("turning on stays off when sign-in is cancelled", async () => {
    await seed({ itemCount: 2, backupEnabled: false });
    jest.mocked(cloud.connect).mockResolvedValue(false);
    const hook = await renderBackup();

    await act(() => hook.result.current.backup.setEnabled(true));

    expect(hook.result.current.settings.settings.backupEnabled).toBe(false);
    expect(cloud.readBackupFile).not.toHaveBeenCalled();
  });

  test("reports iCloud Drive off as unavailable", async () => {
    await seed({ itemCount: 2 });
    jest.mocked(cloud.isAvailable).mockResolvedValue(false);
    const hook = await renderBackup();

    await waitFor(() =>
      expect(hook.result.current.backup.status).toBe("unavailable")
    );
  });

  test("reconnect signs in and loads the backup again", async () => {
    await seed({ itemCount: 2 });
    jest.mocked(cloud.resume).mockResolvedValueOnce(false);
    const hook = await renderBackup();
    await waitFor(() =>
      expect(hook.result.current.backup.status).toBe("signedOut")
    );

    await act(() => hook.result.current.backup.reconnect());

    expect(cloud.connect).toHaveBeenCalled();
    await waitFor(() => expect(hook.result.current.backup.status).toBe("idle"));
  });

  test("turning off while signed out signs in before deleting", async () => {
    await seed({ itemCount: 2 });
    jest.mocked(cloud.resume).mockResolvedValue(false);
    const hook = await renderBackup();
    await waitFor(() =>
      expect(hook.result.current.backup.status).toBe("signedOut")
    );

    await runConfirmed(() => hook.result.current.backup.setEnabled(false));

    expect(cloud.connect).toHaveBeenCalled();
    expect(cloud.deleteBackupFile).toHaveBeenCalled();
    expect(jest.mocked(cloud.connect).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(cloud.deleteBackupFile).mock.invocationCallOrder[0]
    );
  });
});
