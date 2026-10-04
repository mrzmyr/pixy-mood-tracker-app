import { _generateItem } from "@/__tests__/utils";
import { INITIAL_STATE } from "@/constants/Settings";
import {
  canReplaceBackup,
  createBackupFile,
  parseBackupFile,
} from "../backupFile";
import type { BackupFile } from "../backupFile";

const data = (itemCount: number): BackupFile["data"] => ({
  version: "1.88.0",
  items: Array.from({ length: itemCount }, () =>
    _generateItem({ date: "2026-09-01" })
  ),
  tags: [],
  people: [],
  settings: { ...INITIAL_STATE },
});

const file = (deviceId: string, itemCount: number): BackupFile =>
  createBackupFile({
    data: data(itemCount),
    deviceId,
    now: new Date("2026-10-03T08:00:00.000Z"),
  });

describe("backup file", () => {
  test("round-trips through JSON", () => {
    const original = file("phone-a", 2);

    expect(parseBackupFile(JSON.stringify(original))).toEqual(original);
    expect(original.createdAt).toBe("2026-10-03T08:00:00.000Z");
  });

  test("rejects anything that is not a Pixy backup", () => {
    expect(parseBackupFile("not json")).toBeNull();
    expect(parseBackupFile(JSON.stringify(data(1)))).toBeNull();
    expect(
      parseBackupFile(JSON.stringify({ pixyBackup: 2, deviceId: "a" }))
    ).toBeNull();
  });
});

describe("canReplaceBackup()", () => {
  test("never replaces a backup with no entries", () => {
    expect(
      canReplaceBackup({
        existing: null,
        deviceId: "phone-a",
        localItemCount: 0,
      })
    ).toBe(false);
  });

  test("replaces its own backup and writes the first one", () => {
    expect(
      canReplaceBackup({
        existing: file("phone-a", 500),
        deviceId: "phone-a",
        localItemCount: 1,
      })
    ).toBe(true);
    expect(
      canReplaceBackup({
        existing: null,
        deviceId: "phone-a",
        localItemCount: 1,
      })
    ).toBe(true);
  });

  test("keeps a bigger backup from another phone", () => {
    expect(
      canReplaceBackup({
        existing: file("old-phone", 500),
        deviceId: "new-phone",
        localItemCount: 1,
      })
    ).toBe(false);
    expect(
      canReplaceBackup({
        existing: file("old-phone", 500),
        deviceId: "new-phone",
        localItemCount: 500,
      })
    ).toBe(true);
  });
});
