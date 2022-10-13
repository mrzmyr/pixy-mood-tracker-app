import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { Tag } from "./useTags";

const STORAGE_KEY = "PIXEL_TRACKER_SETTINGS";

export const SCALE_TYPES = [
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
  trackBehaviour: boolean;
  actionsDone: IAction[];
  tags?: Tag[]
}

interface IAction {
  title: string;
  date: string;
}

const store = async (settings: Omit<SettingsState, 'loaded'>) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error(e);
  }
};

const load = async (): Promise<SettingsState> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    if (value !== null) {
      const newValue = {
        ...JSON.parse(value),
      };
      if (newValue.deviceId === null) {
        newValue.deviceId = uuidv4();
      }
      return newValue;
    }
  } catch (e) {
    console.error(e);
  }

  return null;
};

function SettingsProvider({ children }: { children: React.ReactNode }) {
  const initialState: SettingsState = {
    loaded: false,
    deviceId: null,
    passcodeEnabled: null,
    passcode: null,
    scaleType: "ColorBrew-RdYlGn",
    reminderEnabled: false,
    reminderTime: "18:00",
    trackBehaviour: true,
    actionsDone: [],
  };

  const [settings, setSettings] = useState<SettingsState>(initialState);

  const resetSettings = useCallback(() => {
    console.log("reset settings");
    setSettings(initialState);
  }, [initialState]);

  const importSettings = useCallback((settings: SettingsState) => {
      console.log("import settings", settings);
      setSettings({
        ...initialState,
        ...settings,
      });
  }, [initialState]);

  useEffect(() => {
    (async () => {
      const json = await load();
      if(json !== null) {
        setSettings({
          ...initialState,
          ...json,
          loaded: true,
        });
      } else {
        setSettings({
          ...initialState,
          deviceId: uuidv4(),
          loaded: true,
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (settings.loaded) {
      store(_.omit(settings, 'loaded'));
    }
  }, [JSON.stringify(settings)]);

  const addActionDone = useCallback((actionTitle: IAction["title"]) => {
    console.log("addActionDone", actionTitle);
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
  }, []);

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
    settings: SettingsState | ((settings: SettingsState) => void)
  ) => void;
  resetSettings: () => void;
  importSettings: (settings: SettingsState) => void;
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
