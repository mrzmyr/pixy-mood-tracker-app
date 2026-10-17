/** Props shared by the platform `EntryDateTimePicker` files. */
export interface EntryDateTimePickerProps {
  /** Entry time as ISO string. `null`: the entry has no time yet. */
  value: string | null;
  /** Gets the picked time as ISO string, never later than now. */
  onChange: (dateTime: string) => void;
}
