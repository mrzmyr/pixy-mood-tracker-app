import type { LogItem } from "@/features/logs";
import type { Tag, TagCategory } from "@/features/tags";
import type { ExportSettings } from "@/state/settings";
import { getJSONSchemaType } from "./import";
import type { ExportPerson, ImportData } from "./import";
import { migrateImportData } from "./migration";

/**
 * Contents of a Pixy backup file in the current format. Avatars travel
 * inline, photo files never do.
 */
export interface Backup {
  items: LogItem[];
  tags: Tag[];
  /** Empty in backups from before tag categories; import puts all tags in General. */
  tagCategories: TagCategory[];
  people: ExportPerson[];
  settings: ExportSettings;
}

/** Result of {@link decodeBackup}. */
export type DecodeBackupResult =
  | { ok: true; backup: Backup; version: string }
  | { ok: false; reason: "invalid_json" | "invalid_schema" };

/** Serializes `backup` as a Pixy export file. Pure. */
export const encodeBackup = (backup: Backup, version: string): string =>
  JSON.stringify({
    version,
    items: backup.items,
    tags: backup.tags,
    tagCategories: backup.tagCategories,
    people: backup.people,
    settings: backup.settings,
  });

/**
 * Migrates parsed export data of any supported version to the current
 * format, then validates it. Pure.
 */
export const decodeBackupData = (data: ImportData): DecodeBackupResult => {
  let migrated: ReturnType<typeof migrateImportData>;
  try {
    // Parsed files are unvalidated: missing fields can make migration throw.
    migrated = migrateImportData(data);
  } catch {
    return { ok: false, reason: "invalid_schema" };
  }
  if (getJSONSchemaType(migrated) !== "pixy") {
    return { ok: false, reason: "invalid_schema" };
  }
  return {
    ok: true,
    version: migrated.version,
    backup: {
      items: migrated.items,
      tags: migrated.tags ?? [],
      tagCategories: migrated.tagCategories ?? [],
      people: migrated.people ?? [],
      settings: migrated.settings,
    },
  };
};

/** Parses and decodes the text of a backup file. Pure. */
export const decodeBackup = (raw: string): DecodeBackupResult => {
  let data: ImportData;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
  return decodeBackupData(data);
};
