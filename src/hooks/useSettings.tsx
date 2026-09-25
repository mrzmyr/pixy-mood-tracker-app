import isBoolean from "lodash/isBoolean";
import omit from "lodash/omit";
import uniq from "lodash/uniq";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import type { ConfigurableLoggerStep } from "@/components/Logger/config";
import { STEP_OPTIONS } from "@/components/Logger/config";
import { load, store } from "@/helpers/storage";
import type { Tag } from "./useTags";
import {
  createMissingProviderError,
  createStructuredError,
} from "@/lib/errors";
import { INITIAL_STATE } from "@/constants/Settings";
import { useContentStableValue } from "./useContentStableValue";

type KnownSettingsStep = ConfigurableLoggerStep | "sleep";

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
 * Persisted user settings.
 *
 * When changing this shape, update the export data in `useDatagate` too.
 * `tags` exists only in legacy data; `TagsProvider` moves it into the tags
 * store on load. `trackBehaviour` is legacy and unused.
 */
export interface SettingsState {
  loaded: boolean;
  deviceId: string | null;
  passcodeEnabled: boolean | null;
  passcode: string | null;
  scaleType: (typeof SCALE_TYPES)[number];
  reminderEnabled: boolean;
  reminderTime: string;
  analyticsEnabled: boolean;
  actionsDone: IAction[];
  steps: KnownSettingsStep[];

  // removed in previous version
  // replaced with analyticsEnabled
  trackBehaviour?: boolean;
  // moved to useTags()
  tags?: Tag[];
}

/**
 * Settings included in data exports. The device id is excluded so an import
 * never clones another device's identity.
 */
export type ExportSettings = Omit<SettingsState, "loaded" | "deviceId">;

interface IAction {
  title: string;
  date: string;
}

interface Value {
  settings: SettingsState;
  setSettings: (
    settings: SettingsState | ((settings: SettingsState) => SettingsState)
  ) => void;
  resetSettings: () => void;
  importSettings: (settings: ExportSettings) => void;
  addActionDone: (action: IAction["title"]) => void;
  hasActionDone: (actionTitle: IAction["title"]) => boolean;
  removeActionDone: (actionTitle: IAction["title"]) => void;
  toggleStep: (step: ConfigurableLoggerStep, value?: boolean) => void;
  hasStep: (step: KnownSettingsStep) => boolean;
}

// SAFETY: every consumer renders inside SettingsProvider, which provides the full Value.
const SettingsStateContext = createContext({} as Value);

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

const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<SettingsState>(INITIAL_STATE);

  const resetSettings = useCallback(() => {
    setSettings({
      ...INITIAL_STATE,
      deviceId: uuidv4(),
      loaded: true,
    });
  }, []);

  const importSettings = useCallback((importedSettings: ExportSettings) => {
    setSettings({
      ...INITIAL_STATE,
      ...importedSettings,
      steps: sanitizeSteps(importedSettings.steps),
      loaded: true,
    });
  }, []);

  useEffect(() => {
    (async () => {
      let json: SettingsState | null;
      try {
        json = await load<SettingsState>(STORAGE_KEY);
      } catch {
        // Keep `loaded: false` so the persist effect below stays disabled;
        // falling back to the initial state would overwrite stored settings.
        return;
      }
      if (json === null) {
        setSettings({
          ...INITIAL_STATE,
          deviceId: uuidv4(),
          loaded: true,
        });
      } else {
        if (!json.deviceId) {
          json.deviceId = uuidv4();
        }
        setSettings({
          ...INITIAL_STATE,
          ...json,
          steps: sanitizeSteps(json.steps),
          loaded: true,
        });
      }
    })();
  }, []);

  // Persist only content changes, not equal copies of the settings object.
  const stableSettings = useContentStableValue(settings);

  useEffect(() => {
    if (stableSettings.loaded) {
      store(STORAGE_KEY, omit(stableSettings, "loaded"));
    }
  }, [stableSettings]);

  const hasActionDone = useCallback(
    (actionTitle: IAction["title"]) =>
      settings.actionsDone.some((action) => action.title === actionTitle),
    [settings.actionsDone]
  );

  const addActionDone = useCallback(
    (actionTitle: IAction["title"]) => {
      if (hasActionDone(actionTitle)) {
        return;
      }

      setSettings((currentSettings) => ({
        ...currentSettings,
        actionsDone: [
          ...currentSettings.actionsDone,
          {
            title: actionTitle,
            date: new Date().toISOString(),
          },
        ],
      }));
    },
    [hasActionDone]
  );

  const removeActionDone = useCallback((actionTitle: IAction["title"]) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      actionsDone: currentSettings.actionsDone.filter(
        (action) => action.title !== actionTitle
      ),
    }));
  }, []);

  const toggleStep = useCallback(
    (step: ConfigurableLoggerStep, value?: boolean) => {
      setSettings((currentSettings) => {
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
      });
    },
    []
  );

  const hasStep = useCallback(
    (step: KnownSettingsStep) =>
      settings.steps.some((configuredStep) => configuredStep === step),
    [settings.steps]
  );

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      resetSettings,
      importSettings,
      addActionDone,
      hasActionDone,
      removeActionDone,
      toggleStep,
      hasStep,
    }),
    [
      settings,
      resetSettings,
      importSettings,
      addActionDone,
      hasActionDone,
      removeActionDone,
      toggleStep,
      hasStep,
    ]
  );

  return (
    <SettingsStateContext.Provider value={value}>
      {children}
    </SettingsStateContext.Provider>
  );
};

const useSettings = (): Value => {
  const context = useContext(SettingsStateContext);
  if (context === undefined) {
    throw createMissingProviderError("useSettings", "SettingsProvider");
  }
  return context;
};

export { SettingsProvider, useSettings };
