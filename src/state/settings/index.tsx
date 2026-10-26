import isBoolean from "lodash/isBoolean";
import uniq from "lodash/uniq";
import { useEffect, useMemo } from "react";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { STEP_OPTIONS } from "@/constants/logger-steps";
import type { ConfigurableLoggerStep } from "@/constants/logger-steps";

import { createPersistedStore } from "@/state/persisted/create-persisted-store";
import type { Load } from "@/state/persisted/create-persisted-store";

// oxlint-disable-next-line eslint/no-restricted-imports -- Persisted feature types stay in their modules until storage refactor.
import type { Tag } from "@/features/tags";
import { createStructuredError } from "@/lib/errors";
import { INITIAL_STATE, QUICK_CHECK_IN_INTERVALS } from "@/constants/settings";
import { applyColorScheme, ColorSchemeSettingSchema } from "./color-scheme";
import { toStoreReviewPromptDates } from "./store-review-prompt-dates";
import type { ColorSchemeSetting } from "./color-scheme";

/**
 * AsyncStorage key for settings. Keep the legacy name; changing it resets
 * every user's settings.
 */
export const STORAGE_KEY = "PIXEL_TRACKER_SETTINGS";

const SCALE_TYPES = [
  "ColorBrew-RdYlGn",
  "ColorBrew-RdYlGn-old",
  "ColorBrew-PiYG",
  "ColorBrew-BrBG",
];

/**
 * Calendar screen layout: `calendar` shows month grids, `timeline` a list of
 * entry cards. Read through `useCalendarLayout`, which applies the
 * `calendar-timeline` flag. Unknown stored values, like `map` from older
 * versions, read as `calendar`.
 */
export type CalendarLayout = "calendar" | "timeline";

const isCalendarLayout = (value: unknown): value is CalendarLayout =>
  value === "calendar" || value === "timeline";

/** Times of the quick check-in notifications. */
export interface QuickCheckInSchedule {
  /** First check-in of the day, `HH:mm`. */
  from: string;
  /** Last possible check-in of the day, `HH:mm`. */
  until: string;
  /** Hours between check-ins. */
  everyHours: number;
}

const QuickCheckInScheduleSchema = z.object({
  from: z.string().regex(/^\d{2}:\d{2}$/u),
  until: z.string().regex(/^\d{2}:\d{2}$/u),
  everyHours: z
    .number()
    .refine((hours) => QUICK_CHECK_IN_INTERVALS.some((step) => step === hours)),
});

/**
 * Persisted user settings.
 *
 * When adding a field, decide in `toExportSettings` (`exportSettings.ts`) whether backups carry it.
 * `tags` exists only in legacy data; `TagsProvider` moves it into the tags
 * store on load. `trackBehaviour` is legacy and unused.
 */
export interface SettingsState {
  deviceId: string | null;
  scaleType: (typeof SCALE_TYPES)[number];
  reminderEnabled: boolean;
  reminderTime: string;
  analyticsEnabled: boolean;
  actionsDone: IAction[];
  steps: ConfigurableLoggerStep[];
  /**
   * ISO dates of automatic store review prompts, oldest first. Replaces
   * the single `storeReviewPromptedAt` date of older versions.
   */
  storeReviewPromptDates: string[];
  /** App version that showed the last automatic store review prompt. */
  storeReviewPromptedAppVersion: string | null;
  /**
   * The user dismissed the "See your photos from …" row in the photos step,
   * or denied library access. The row never shows again on this install.
   */
  photosDayAccessDismissed: boolean;
  /** Theme for this device. */
  colorScheme: ColorSchemeSetting;
  /**
   * New entries get the current location. Needs location access, which
   * belongs to the device.
   */
  locationEnabled: boolean;
  /**
   * The sleep step starts with a quality scored from Apple Health. Health
   * access belongs to the device.
   */
  healthSleepEnabled: boolean;
  /** Calendar screen layout for this device. */
  calendarLayout: CalendarLayout;
  /**
   * Pixy asks for Face ID, Touch ID, fingerprint, or the device passcode on
   * launch and after time away. Device auth belongs to the device.
   */
  appLockEnabled: boolean;
  /**
   * Pixy sends a notification on the last day of each week, month, and year.
   * Needs notification permission, which belongs to the device.
   */
  recapNotificationsEnabled: boolean;
  /** Name the user gave themselves; empty until set. Stays on this device. */
  profileName: string;
  /**
   * Relative path of the profile photo under the documents directory, or
   * `null`. Stays on this device; backups carry no profile.
   */
  profileAvatar: string | null;
  /**
   * Quick check-in notifications during the day, on the
   * `quickCheckInSchedule`. Needs notification permission, so imports keep
   * it.
   */
  quickCheckInEnabled: boolean;
  /**
   * Quick check-in times: every `everyHours` hours from `from` to `until`
   * (`HH:mm`), both included. Belongs to the device like the switch.
   */
  quickCheckInSchedule: QuickCheckInSchedule;

  // removed in previous version
  // replaced with analyticsEnabled
  trackBehaviour?: boolean;
  // moved to useTags()
  tags?: Tag[];
}

/**
 * Settings included in data exports. The device id is excluded so an import
 * never clones another device's identity. Store review prompt state belongs
 * to the device and store account, and photo library access, theme,
 * location, calendar layout, app lock, recap notifications, the profile,
 * quick check-ins, and Apple Health to the device, so imports keep the
 * current values.
 */
export type ExportSettings = Omit<
  SettingsState,
  | "deviceId"
  | "storeReviewPromptDates"
  | "storeReviewPromptedAppVersion"
  | "photosDayAccessDismissed"
  | "colorScheme"
  | "locationEnabled"
  | "healthSleepEnabled"
  | "calendarLayout"
  | "appLockEnabled"
  | "recapNotificationsEnabled"
  | "profileName"
  | "profileAvatar"
  | "quickCheckInEnabled"
  | "quickCheckInSchedule"
>;

interface IAction {
  title: string;
  date: string;
}

interface Value {
  settings: SettingsState;
  setSettings: (update: (settings: SettingsState) => SettingsState) => void;
  resetSettings: () => void;
  importSettings: (settings: ExportSettings) => void;
  addActionDone: (action: IAction["title"]) => void;
  hasActionDone: (actionTitle: IAction["title"]) => boolean;
  removeActionDone: (actionTitle: IAction["title"]) => void;
  toggleStep: (step: ConfigurableLoggerStep, value?: boolean) => void;
  hasStep: (step: ConfigurableLoggerStep) => boolean;
}

const isConfigurableLoggerStep = (
  step: unknown
): step is ConfigurableLoggerStep =>
  typeof step === "string" && STEP_OPTIONS.some((option) => option === step);

const sanitizeSteps = (
  steps: SettingsState["steps"] | undefined
): ConfigurableLoggerStep[] =>
  (Array.isArray(steps) ? steps : INITIAL_STATE.steps).filter(
    isConfigurableLoggerStep
  );

type SettingsAction =
  | { type: "set"; payload: (settings: SettingsState) => SettingsState }
  | { type: "import"; payload: ExportSettings }
  | { type: "reset" };

const reducer = (
  state: SettingsState,
  action: SettingsAction
): SettingsState => {
  switch (action.type) {
    case "set": {
      return action.payload(state);
    }
    // Store review prompt state, photo library access, theme, location,
    // calendar layout, app lock, recap notifications, the profile, and Apple
    // Health belong to this device, so imports keep the current values.
    case "import": {
      return {
        ...INITIAL_STATE,
        ...action.payload,
        steps: sanitizeSteps(action.payload.steps),
        storeReviewPromptDates: state.storeReviewPromptDates,
        storeReviewPromptedAppVersion: state.storeReviewPromptedAppVersion,
        photosDayAccessDismissed: state.photosDayAccessDismissed,
        colorScheme: state.colorScheme,
        locationEnabled: state.locationEnabled,
        healthSleepEnabled: state.healthSleepEnabled,
        calendarLayout: state.calendarLayout,
        appLockEnabled: state.appLockEnabled,
        recapNotificationsEnabled: state.recapNotificationsEnabled,
        profileName: state.profileName,
        profileAvatar: state.profileAvatar,
        quickCheckInEnabled: state.quickCheckInEnabled,
        quickCheckInSchedule: state.quickCheckInSchedule,
      };
    }
    case "reset": {
      return { ...INITIAL_STATE, deviceId: uuidv4() };
    }
    default: {
      return state;
    }
  }
};

/** Stored settings, possibly written by an older app version. */
type StoredSettings = SettingsState & {
  /** Single prompt date before `storeReviewPromptDates`. */
  storeReviewPromptedAt?: unknown;
};

const hydrateStored = ({
  storeReviewPromptedAt,
  ...stored
}: StoredSettings): SettingsState => ({
  ...INITIAL_STATE,
  ...stored,
  deviceId: stored.deviceId || uuidv4(),
  steps: sanitizeSteps(stored.steps),
  storeReviewPromptDates: toStoreReviewPromptDates({
    storeReviewPromptDates: stored.storeReviewPromptDates,
    storeReviewPromptedAt,
  }),
  photosDayAccessDismissed: stored.photosDayAccessDismissed === true,
  locationEnabled: stored.locationEnabled === true,
  healthSleepEnabled: stored.healthSleepEnabled === true,
  colorScheme:
    ColorSchemeSettingSchema.safeParse(stored.colorScheme).data ?? "system",
  calendarLayout: isCalendarLayout(stored.calendarLayout)
    ? stored.calendarLayout
    : "calendar",
  appLockEnabled: stored.appLockEnabled === true,
  recapNotificationsEnabled: stored.recapNotificationsEnabled === true,
  profileName: z.string().safeParse(stored.profileName).data ?? "",
  profileAvatar: z.string().safeParse(stored.profileAvatar).data ?? null,
  quickCheckInEnabled: stored.quickCheckInEnabled === true,
  quickCheckInSchedule:
    QuickCheckInScheduleSchema.safeParse(stored.quickCheckInSchedule).data ??
    INITIAL_STATE.quickCheckInSchedule,
});

const hydrate = (stored: StoredSettings | null): SettingsState =>
  stored === null
    ? { ...INITIAL_STATE, deviceId: uuidv4() }
    : hydrateStored(stored);

const settingsStore = createPersistedStore<SettingsState, SettingsAction>({
  key: STORAGE_KEY,
  name: "Settings",
  initial: () => INITIAL_STATE,
  hydrate,
  reducer,
});

const ColorSchemeSync = () => {
  const { colorScheme } = settingsStore.useState();
  useEffect(() => {
    applyColorScheme(colorScheme);
  }, [colorScheme]);
  return null;
};

/** Settings store. Renders above every other persisted store. */
const SettingsProvider = ({ children }: { children: React.ReactNode }) => (
  <settingsStore.Provider>
    <ColorSchemeSync />
    {children}
  </settingsStore.Provider>
);

const useSettings = (): Value => {
  const settings = settingsStore.useState();
  const dispatch = settingsStore.useDispatch();

  return useMemo(() => {
    const hasActionDone = (actionTitle: IAction["title"]) =>
      settings.actionsDone.some((action) => action.title === actionTitle);

    return {
      settings,
      setSettings: (payload) => dispatch({ type: "set", payload }),
      resetSettings: () => dispatch({ type: "reset" }),
      importSettings: (payload) => dispatch({ type: "import", payload }),
      hasActionDone,
      addActionDone: (actionTitle) => {
        if (hasActionDone(actionTitle)) {
          return;
        }
        dispatch({
          type: "set",
          payload: (currentSettings) => ({
            ...currentSettings,
            actionsDone: [
              ...currentSettings.actionsDone,
              { title: actionTitle, date: new Date().toISOString() },
            ],
          }),
        });
      },
      removeActionDone: (actionTitle) =>
        dispatch({
          type: "set",
          payload: (currentSettings) => ({
            ...currentSettings,
            actionsDone: currentSettings.actionsDone.filter(
              (action) => action.title !== actionTitle
            ),
          }),
        }),
      toggleStep: (step, value) =>
        dispatch({
          type: "set",
          payload: (currentSettings) => {
            const shouldAdd = isBoolean(value)
              ? value
              : !currentSettings.steps.includes(step);

            if (!STEP_OPTIONS.includes(step)) {
              throw createStructuredError({
                status: "invalid_logger_step",
                message: `Step ${step} is not a valid step`,
                why: `Step ${step} is not one of STEP_OPTIONS`,
                fix: "Pass a step listed in STEP_OPTIONS",
              });
            }

            if (shouldAdd) {
              return {
                ...currentSettings,
                steps: uniq([...currentSettings.steps, step]),
              };
            }
            return {
              ...currentSettings,
              steps: currentSettings.steps.filter((s) => s !== step),
            };
          },
        }),
      hasStep: (step) =>
        settings.steps.some((configuredStep) => configuredStep === step),
    };
  }, [settings, dispatch]);
};

/** Read one setting through the existing context; all context changes still rerender subscribers. */
const useSetting = <Key extends keyof SettingsState>(
  key: Key
): SettingsState[Key] => settingsStore.useState()[key];

/** Load status of the settings store; `error` means stored settings exist but could not be read. */
const useSettingsLoad = (): Load => settingsStore.useLoad();

export { SettingsProvider, useSetting, useSettings, useSettingsLoad };
