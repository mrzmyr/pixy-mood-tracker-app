import { t } from "@/lib/translation";
import type { EntryTimePreset } from "../entry-time";
import { ENTRY_TIME_PRESETS, getPresetDateTime } from "../entry-time";

/** Props shared by the platform `EntryTimeMenu` files. Each action closes the menu first. */
export interface EntryTimeMenuProps {
  /** Entry time, local ISO string. */
  dateTime: string;
  /** Pill text and spoken name of the trigger. */
  label: string;
  testID: string;
  /** Sets a new entry time (ISO string). */
  onChange: (dateTime: string) => void;
  /** Opens the full date and time picker. */
  onChoose: () => void;
}

/** One preset row of the entry time menu. `dateTime` is `null` when disabled. */
export interface EntryTimeMenuPreset {
  id: EntryTimePreset;
  title: string;
  dateTime: string | null;
}

/** Morning, Afternoon, Evening rows for `dateTime`. Future times are disabled. */
export const getEntryTimeMenuPresets = (
  dateTime: string
): EntryTimeMenuPreset[] =>
  ENTRY_TIME_PRESETS.map(([id, hour]) => ({
    id,
    title: t(id),
    dateTime: getPresetDateTime({ dateTime, hour }),
  }));
