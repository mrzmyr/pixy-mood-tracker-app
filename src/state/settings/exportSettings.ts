import type { ExportSettings, SettingsState } from "@/state/settings";

/**
 * Projects settings onto the fields a backup carries. Device-bound fields
 * (device id, store review prompt, photo library access) stay on the device.
 */
export const toExportSettings = (settings: SettingsState): ExportSettings => ({
  scaleType: settings.scaleType,
  reminderEnabled: settings.reminderEnabled,
  reminderTime: settings.reminderTime,
  trackBehaviour: settings.trackBehaviour,
  analyticsEnabled: settings.analyticsEnabled,
  actionsDone: settings.actionsDone,
  steps: settings.steps,
});
