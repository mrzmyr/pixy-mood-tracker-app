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
import { load, store } from "../helpers/storage";
import { Tag } from "./useTags";

export const STORAGE_KEY = "PIXEL_TRACKER_SETTINGS";

const SCALE_TYPES = [
  "ColorBrew-RdYlGn",
  "ColorBrew-RdYlGn-old",
  "ColorBrew-PiYG",
  "ColorBrew-BrBG",
];

const SettingsStateContext = createContext(undefined);

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

  // remove in previous version
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
  analyticsEnabled: true,
  actionsDone: [],
};

function SettingsProvider({ children }: { children: React.ReactNode }) {

  const [settings, setSettings] = useState<SettingsState>(INITIAL_STATE);

  const resetSettings = useCallback(() => {
    setSettings({
      ...INITIAL_STATE,
      deviceId: uuidv4(),
      loaded: true,
    });
  }, [INITIAL_STATE]);

  const importSettings = useCallback((settings: SettingsState) => {
    setSettings({
      ...INITIAL_STATE,
      ...settings,
      loaded: true,
    });
  }, [INITIAL_STATE]);

  useEffect(() => {
    (async () => {
      const json = await load<SettingsState>(STORAGE_KEY);
      if (json !== null) {
        if (!json.deviceId) {
          json.deviceId = uuidv4();
        }
        setSettings({
          ...INITIAL_STATE,
          ...json,
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

  const hasActionDone = useCallback(
    (actionTitle: IAction["title"]) => {
      return settings.actionsDone.some(
        (action) => action.title === actionTitle
      );
    },
    [settings.actionsDone]
  );

  const value = {
    settings,
    setSettings,
    resetSettings,
    importSettings,
    addActionDone,
    hasActionDone,
  };

  return (
    <SettingsStateContext.Provider value={value}>
      {children}
    </SettingsStateContext.Provider>
  );
}

function useSettings(): {
  settings: SettingsState;
  setSettings: (
    settings: SettingsState | ((settings: SettingsState) => SettingsState)
  ) => void;
  resetSettings: () => void;
  importSettings: (settings: ExportSettings) => void;
  addActionDone: (action: IAction["title"]) => void;
  hasActionDone: (actionTitle: IAction["title"]) => boolean;
} {
  const context = useContext(SettingsStateContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

export { SettingsProvider, useSettings };
