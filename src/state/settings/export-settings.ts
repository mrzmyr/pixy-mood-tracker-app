import type { ExportSettings, SettingsState } from "@/state/settings";

/**
 * Projects settings onto the fields a backup carries. Device-bound fields
 * (device id, feedback id, analytics consent, store review prompt, photo library access, theme,
 * location, app lock, recap notifications, profile, quick check-in, Apple
 * Health) stay on the device.
 */
export const toExportSettings = (settings: SettingsState): ExportSettings => ({
  scaleType: settings.scaleType,
  reminderEnabled: settings.reminderEnabled,
  reminderTime: settings.reminderTime,
  trackBehaviour: settings.trackBehaviour,
  actionsDone: settings.actionsDone,
  steps: settings.steps,
});
