import type { SettingsState } from "@/hooks/useSettings";

export const INITIAL_STATE: SettingsState = {
  loaded: false,
  deviceId: null,
  passcodeEnabled: null,
  passcode: null,
  scaleType: "ColorBrew-RdYlGn",
  reminderEnabled: false,
  reminderTime: "18:00",
  analyticsEnabled: false,
  actionsDone: [],
  steps: ["rating", "emotions", "tags", "message", "feedback"],
};
