import type { ReactElement } from "react";

/** Input of the platform `useEntryTimePicker` files. */
export interface EntryTimePickerOptions {
  /** Entry time the picker starts at. */
  value: Date;
  /** New entry time. Never in the future. */
  onChange: (date: Date) => void;
}

/** Output of the platform `useEntryTimePicker` files. */
export interface EntryTimePicker {
  /** Opens the full date and time picker. */
  open: () => void;
  /** Element to render: the iOS sheet. `null` on Android and web. */
  sheet: ReactElement | null;
}
