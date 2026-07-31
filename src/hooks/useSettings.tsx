import _ from "lodash";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from "react";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { ConfigurableLoggerStep, STEP_OPTIONS } from "@/components/Logger/config";
import { load, store } from "@/helpers/storage";
import { Tag } from "./useTags";

type KnownSettingsStep = ConfigurableLoggerStep | "sleep";

export const STORAGE_KEY = "PIXEL_TRACKER_SETTINGS";

const SCALE_TYPES = [
  "ColorBrew-RdYlGn",
  "ColorBrew-RdYlGn-old",
  "ColorBrew-PiYG",
  "ColorBrew-BrBG",
];

// ATTENTION: If you change the settings state, you need to update
// the export variables also in the DataGate
export interface SettingsState {
  loaded: boolean;
  deviceId: string | null;
  passcodeEnabled: boolean | null;
  passcode: string | null;
  scaleType: typeof SCALE_TYPES[number];
  reminderEnabled: Boolean;
  reminderTime: string;
  analyticsEnabled: boolean;
  actionsDone: IAction[];
  steps: KnownSettingsStep[];

  // removed in previous version
  trackBehaviour?: boolean; // replaced with analyticsEnabled
  tags?: Tag[] // moved to useTags()
}

export type ExportSettings = Omit<SettingsState, 'loaded' | 'deviceId'>;

interface IAction {
  title: string;
  date: string;
}

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
  steps: [
    "rating",
    "emotions",
    "tags",
    "message",
    "feedback"
  ],
};

type Value = {
  settings: SettingsState;
  setSettings: (
    settings: SettingsState | ((settings: SettingsState) => SettingsState)
  ) => void;
  resetSettings: () => void;
  importSettings: (settings: ExportSettings) => void;
  addActionDone: (action: IAction["title"]) => void;
  hasActionDone: (actionTitle: IAction["title"]) => boolean;
  removeActionDone: (actionTitle: IAction["title"]) => void;
  toggleStep: (step: ConfigurableLoggerStep, value?: Boolean) => void;
  hasStep: (step: KnownSettingsStep) => boolean;
}

const SettingsStateContext = createContext({} as Value);

const isConfigurableLoggerStep = (step: unknown): step is ConfigurableLoggerStep =>
  typeof step === "string" && STEP_OPTIONS.includes(step as ConfigurableLoggerStep);

const sanitizeSteps = (steps: unknown): ConfigurableLoggerStep[] =>
  (Array.isArray(steps) ? steps : INITIAL_STATE.steps).filter(isConfigurableLoggerStep);

function SettingsProvider({ children }: { children: React.ReactNode }) {

  const [settings, setSettings] = useState<SettingsState>(INITIAL_STATE);

  const resetSettings = useCallback(() => {
    setSettings({
      ...INITIAL_STATE,
      deviceId: uuidv4(),
      loaded: true,
    });
  }, [INITIAL_STATE]);

  const importSettings = useCallback((settings: ExportSettings) => {
    setSettings({
      ...INITIAL_STATE,
      ...settings,
      steps: sanitizeSteps(settings.steps),
      loaded: true,
    });
  }, [INITIAL_STATE]);

  useEffect(() => {
    (async () => {
      let json: SettingsState | null;
      try {
        json = await load<SettingsState>(STORAGE_KEY);
      } catch (error) {
        // Keep `loaded: false` so the persist effect below stays disabled;
        // falling back to the initial state would overwrite stored settings.
        return;
      }
      if (json !== null) {
        if (!json.deviceId) {
          json.deviceId = uuidv4();
        }
        setSettings({
          ...INITIAL_STATE,
          ...json,
          steps: sanitizeSteps(json.steps),
          loaded: true,
        });
      } else {
        setSettings({
          ...INITIAL_STATE,
          deviceId: uuidv4(),
          loaded: true,
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (settings.loaded) {
      store(STORAGE_KEY, _.omit(settings, 'loaded'));
    }
  }, [JSON.stringify(settings)]);

  const addActionDone = useCallback((actionTitle: IAction["title"]) => {
    if (hasActionDone(actionTitle)) {
      return;
    }

    setSettings((settings) => ({
      ...settings,
      actionsDone: [
        ...settings.actionsDone,
        {
          title: actionTitle,
          date: new Date().toISOString(),
        },
      ],
    }));
  }, [settings.actionsDone]);

  const removeActionDone = useCallback((actionTitle: IAction["title"]) => {
    setSettings((settings) => ({
      ...settings,
      actionsDone: settings.actionsDone.filter(
        (action) => action.title !== actionTitle
      ),
    }));
  }, [settings.actionsDone]);

  const hasActionDone = useCallback(
    (actionTitle: IAction["title"]) => {
      return settings.actionsDone.some(
        (action) => action.title === actionTitle
      );
    },
    [settings.actionsDone]
  );

  const toggleStep = useCallback((step: ConfigurableLoggerStep, value: Boolean) => {
    setSettings((settings) => {
      const shouldAdd = _.isBoolean(value) ? value : !settings.steps.includes(step);

      if (!STEP_OPTIONS.includes(step)) {
        throw new Error(`Step ${step} is not a valid step`);
      }

      if (shouldAdd) {
        return {
          ...settings,
          steps: _.uniq([...settings.steps, step]),
        };
      } else {
        return {
          ...settings,
          steps: settings.steps.filter((s) => s !== step),
        };
      }
    });
  }, []);

  const hasStep = useCallback((step: KnownSettingsStep) => {
    return settings.steps.some((configuredStep) => configuredStep === step);
  }, [settings.steps]);

  const value = {
    settings,
    setSettings,
    resetSettings,
    importSettings,
    addActionDone,
    hasActionDone,
    removeActionDone,
    toggleStep,
    hasStep,
  };

  return (
    <SettingsStateContext.Provider value={value}>
      {children}
    </SettingsStateContext.Provider>
  );
}

function useSettings(): Value {
  const context = useContext(SettingsStateContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

export { SettingsProvider, useSettings };
