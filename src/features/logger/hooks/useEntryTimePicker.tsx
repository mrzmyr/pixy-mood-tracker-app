import type {
  EntryTimePicker,
  EntryTimePickerOptions,
} from "./entryTimePickerTypes";

/**
 * Web build of the entry date and time picker: none. `@expo/ui` has no web
 * module, and the web time menu holds the browser date and time field.
 */
export const useEntryTimePicker = (
  _options: EntryTimePickerOptions
): EntryTimePicker => ({
  open: () => null,
  sheet: null,
});
