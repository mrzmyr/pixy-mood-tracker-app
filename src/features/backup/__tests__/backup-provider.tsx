import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { Alert } from "react-native";
import { INITIAL_STATE } from "@/constants/settings";
import { _generateItem } from "@/testing/log-item";
import {
  LogsProvider,
  STORAGE_KEY as LOGS_KEY,
  useLogLoad,
  useLogState,
} from "@/features/logs";
import { pixySchema } from "@/features/datagate";
import { PeopleProvider } from "@/features/people";
import { TagsProvider } from "@/features/tags";
import { AnalyticsProvider } from "@/state/analytics";
import { FeatureFlagsProvider } from "@/state/feature-flags";
import {
  SettingsProvider,
  STORAGE_KEY as SETTINGS_KEY,
  useSettings,
} from "@/state/settings";
import { toExportSettings } from "@/state/settings/export-settings";
import { createBackupFile } from "../backup-file";
import type { BackupFile } from "../backup-file";
import {
  AUTO_BACKUP_DELAY_MS,
  BackupProvider,
  useBackup,
} from "../backup-provider";
import { setBackupCloudOverride } from "../providers";

/** Stands in for iCloud and Google Drive: Jest has no native cloud. */
const cloud = {
  connect: jest.fn<Promise<boolean>, []>(),
  resume: jest.fn<Promise<boolean>, []>(),
  disconnect: jest.fn<Promise<void>, []>(),
  isAvailable: jest.fn<Promise<boolean>, []>(),
  readBackupFile: jest.fn<Promise<string | null>, []>(),
  writeBackupFile: jest.fn<Promise<void>, [string]>(),
  deleteBackupFile: jest.fn<Promise<void>, []>(),
};

// oxlint-disable-next-line anti-slop/no-module-mocking -- reportError sends through the Sentry SDK; the test asserts on captureException
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
  backupProvider = "icloud",
}: {
  itemCount: number;
  backupProvider?: "icloud" | "googledrive" | null;
}) => {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      ...INITIAL_STATE,
      deviceId: DEVICE_ID,
      backupProvider,
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

const remoteFile = (
  deviceId: string,
  itemCount: number,
  now = new Date("2026-10-01T10:00:00.000Z")
): BackupFile =>
  createBackupFile({
    deviceId,
    now,
    version: "1.88.0",
    backup: {
      items: Array.from({ length: itemCount }, (_, index) =>
        _generateItem({ date: `2025-01-${String(index + 1).padStart(2, "0")}` })
      ),
      tags: [],
      tagCategories: [{ id: "general", title: "General" }],
      people: [],
      // Onboarding done, like every real backup.
      settings: toExportSettings({ ...INITIAL_STATE, actionsDone: ONBOARDED }),
    },
  });

/** Jest runs as iOS. Google Drive on iOS needs an OAuth client id. */
const setGoogleIosClient = (clientId: string | null) => {
  if (Constants.expoConfig) {
    Constants.expoConfig.extra = {
      ...Constants.expoConfig.extra,
      googleIosClientId: clientId,
    };
  }
};

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
    const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? [];
    buttons.find((button) => button.style === "destructive")?.onPress?.();
    await running;
  });

describe("BackupProvider", () => {
  jest.setTimeout(20_000);

  beforeEach(async () => {
    jest.clearAllMocks();
    cloud.connect.mockResolvedValue(true);
    cloud.resume.mockResolvedValue(true);
    cloud.disconnect.mockResolvedValue();
    cloud.isAvailable.mockResolvedValue(true);
    cloud.readBackupFile.mockResolvedValue(null);
    cloud.writeBackupFile.mockResolvedValue();
    cloud.deleteBackupFile.mockResolvedValue();
    setBackupCloudOverride(cloud);
    mockReloadFlags.mockResolvedValue({
      "backup-ios-icloud": true,
      "backup-ios-google-drive": true,
    });
    jest.spyOn(Alert, "alert");
    await AsyncStorage.clear();
  });

  afterEach(() => {
    setGoogleIosClient(null);
    setBackupCloudOverride(null);
    jest.restoreAllMocks();
  });

  test("writes a backup with this phone's id after changes", async () => {
    await seed({ itemCount: 2 });
    const hook = await renderBackup();
    await waitFor(() => expect(hook.result.current.backup.status).toBe("idle"));

    await waitForAutoBackup();

    await waitFor(() => expect(cloud.writeBackupFile).toHaveBeenCalledTimes(1));
    const written = JSON.parse(cloud.writeBackupFile.mock.calls[0][0]);
    expect(written.deviceId).toBe(DEVICE_ID);
    expect(written.data.items).toHaveLength(2);
    expect(hook.result.current.backup.lastBackupAt).toBe(written.createdAt);
  });

  test("flag of the chosen cloud off: never reads or writes the cloud", async () => {
    mockReloadFlags.mockResolvedValue({ "backup-ios-google-drive": true });
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
    cloud.readBackupFile.mockResolvedValue(
      JSON.stringify(remoteFile("old-phone", 5))
    );
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
    cloud.readBackupFile.mockResolvedValue(
      JSON.stringify(remoteFile("old-phone", 5))
    );
    const hook = await renderBackup();
    await waitFor(() =>
      expect(hook.result.current.backup.canRestore).toBe(true)
    );

    await runConfirmed(() => hook.result.current.backup.restore());

    await waitFor(() => expect(hook.result.current.logs.items).toHaveLength(5));
  });

  test("after restore, the first write holds the restored data, never the old local data", async () => {
    await seed({ itemCount: 1 });
    cloud.readBackupFile.mockResolvedValue(
      JSON.stringify(remoteFile("old-phone", 5))
    );
    const hook = await renderBackup();
    await waitFor(() =>
      expect(hook.result.current.backup.canRestore).toBe(true)
    );

    await runConfirmed(() => hook.result.current.backup.restore());
    await waitForAutoBackup();

    await waitFor(() => expect(cloud.writeBackupFile).toHaveBeenCalled());
    const itemCounts = cloud.writeBackupFile.mock.calls.map(
      ([contents]) => JSON.parse(contents).data.items.length
    );
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
    const otherPhone = remoteFile(
      "other-phone",
      1,
      new Date(Date.now() + 60_000)
    );
    cloud.readBackupFile.mockResolvedValue(JSON.stringify(otherPhone));
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

  test("restore keeps this phone's onboarding and backup stays on", async () => {
    await seed({ itemCount: 1 });
    const backup = remoteFile("old-phone", 5);
    backup.data.settings = { ...backup.data.settings, actionsDone: [] };
    cloud.readBackupFile.mockResolvedValue(JSON.stringify(backup));
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
    cloud.readBackupFile.mockResolvedValue(
      JSON.stringify(remoteFile("old-phone", 5))
    );
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
    cloud.readBackupFile.mockResolvedValue(
      JSON.stringify({ pixyBackup: 2, deviceId: "x" })
    );
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
    cloud.resume.mockRejectedValue(
      Object.assign(new Error("No connection"), { status: "backup_offline" })
    );
    const hook = await renderBackup();

    await waitFor(() =>
      expect(hook.result.current.backup.status).toBe("unavailable")
    );
    expect(backupReports()).toHaveLength(0);
  });

  test("revoked Google access asks to sign in again, without a Sentry report", async () => {
    await seed({ itemCount: 2 });
    cloud.readBackupFile.mockRejectedValue(
      Object.assign(new Error("Google Drive rejected the sign-in"), {
        status: "backup_signed_out",
        code: "ERR_AUTHENTICATION_FAILED",
      })
    );
    const hook = await renderBackup();

    await waitFor(() =>
      expect(hook.result.current.backup.status).toBe("signedOut")
    );
    expect(backupReports()).toHaveLength(0);
  });

  test("reports the same failure to Sentry once per session", async () => {
    await seed({ itemCount: 2 });
    cloud.writeBackupFile.mockRejectedValue(new Error("disk"));
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
    expect(backupReports()[0][0]).toMatchObject({
      status: "backup_write_failed",
    });
  });

  test("turning off asks, deletes the backup, and stores the switch", async () => {
    await seed({ itemCount: 2 });
    const hook = await renderBackup();
    await waitFor(() => expect(hook.result.current.backup.status).toBe("idle"));

    await runConfirmed(() => hook.result.current.backup.turnOff());

    expect(cloud.deleteBackupFile).toHaveBeenCalled();
    expect(cloud.disconnect).toHaveBeenCalled();
    await waitFor(() =>
      expect(hook.result.current.settings.settings.backupProvider).toBeNull()
    );
    expect(hook.result.current.backup.status).toBe("off");
  });

  test("turning off still turns off when the cloud copy cannot be deleted", async () => {
    await seed({ itemCount: 2 });
    cloud.deleteBackupFile.mockRejectedValue(
      new Error("The user has not granted access")
    );
    const hook = await renderBackup();
    await waitFor(() => expect(hook.result.current.backup.status).toBe("idle"));

    await runConfirmed(() => hook.result.current.backup.turnOff());

    await waitFor(() =>
      expect(hook.result.current.settings.settings.backupProvider).toBeNull()
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
    cloud.resume.mockResolvedValue(false);
    cloud.connect.mockResolvedValue(false);
    const hook = await renderBackup();
    await waitFor(() =>
      expect(hook.result.current.backup.status).toBe("signedOut")
    );

    await runConfirmed(() => hook.result.current.backup.turnOff());

    expect(cloud.deleteBackupFile).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(hook.result.current.settings.settings.backupProvider).toBeNull()
    );
    expect(Alert.alert).toHaveBeenLastCalledWith(
      "Backup Is Off",
      expect.any(String),
      expect.any(Array),
      expect.any(Object)
    );
  });

  test("turning on stays off when sign-in is cancelled", async () => {
    await seed({ itemCount: 2, backupProvider: null });
    cloud.connect.mockResolvedValue(false);
    const hook = await renderBackup();

    await act(() => hook.result.current.backup.turnOn("icloud"));

    expect(hook.result.current.settings.settings.backupProvider).toBeNull();
    expect(cloud.readBackupFile).not.toHaveBeenCalled();
  });

  test("reports iCloud Drive off as unavailable", async () => {
    await seed({ itemCount: 2 });
    cloud.isAvailable.mockResolvedValue(false);
    const hook = await renderBackup();

    await waitFor(() =>
      expect(hook.result.current.backup.status).toBe("unavailable")
    );
  });

  test("reconnect signs in and loads the backup again", async () => {
    await seed({ itemCount: 2 });
    cloud.resume.mockResolvedValueOnce(false);
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
    cloud.resume.mockResolvedValue(false);
    const hook = await renderBackup();
    await waitFor(() =>
      expect(hook.result.current.backup.status).toBe("signedOut")
    );

    await runConfirmed(() => hook.result.current.backup.turnOff());

    expect(cloud.connect).toHaveBeenCalled();
    expect(cloud.deleteBackupFile).toHaveBeenCalled();
    expect(cloud.connect.mock.invocationCallOrder[0]).toBeLessThan(
      cloud.deleteBackupFile.mock.invocationCallOrder[0]
    );
  });

  test("turning on Google Drive stores the choice and backs up there", async () => {
    setGoogleIosClient("ios-client.apps.googleusercontent.com");
    await seed({ itemCount: 2, backupProvider: null });
    const hook = await renderBackup();

    await act(() => hook.result.current.backup.turnOn("googledrive"));

    await waitFor(() =>
      expect(hook.result.current.settings.settings.backupProvider).toBe(
        "googledrive"
      )
    );
    await waitForAutoBackup();
    await waitFor(() => expect(cloud.writeBackupFile).toHaveBeenCalledTimes(1));
  });

  test("one cloud at a time: a second cloud stays off while one is on", async () => {
    await seed({ itemCount: 2, backupProvider: "icloud" });
    const hook = await renderBackup();
    await waitFor(() => expect(hook.result.current.backup.status).toBe("idle"));

    await act(() => hook.result.current.backup.turnOn("googledrive"));

    expect(cloud.connect).not.toHaveBeenCalled();
    expect(hook.result.current.settings.settings.backupProvider).toBe("icloud");
  });

  test("writes a file the import dialog accepts", async () => {
    await seed({ itemCount: 2 });
    await renderBackup();

    await waitForAutoBackup();

    await waitFor(() => expect(cloud.writeBackupFile).toHaveBeenCalledTimes(1));
    const written = JSON.parse(cloud.writeBackupFile.mock.calls[0][0]);
    expect(pixySchema.safeParse(written.data).success).toBe(true);
  });
});
