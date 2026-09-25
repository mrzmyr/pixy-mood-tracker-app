import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { useSettings } from "./useSettings";
import * as LocalAuthentication from "expo-local-authentication";
import { createMissingProviderError } from "@/lib/errors";

interface PasscodeState {
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  isEnabled: boolean | null;
}

// SAFETY: every consumer renders inside PasscodeProvider, which supplies the full state.
const PasscodeContext = createContext({} as PasscodeState);

const PasscodeProvider = ({ children }: { children: React.ReactNode }) => {
  const { settings } = useSettings();
  const [isAuthenticated, setIsAuthenticated] =
    useState<PasscodeState["isAuthenticated"]>(false);
  const [isEnabled, setIsEnabled] = useState<PasscodeState["isEnabled"]>(null);

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (isEnabled && !isAuthenticated) {
      void (async () => {
        const result = await LocalAuthentication.authenticateAsync();
        setIsAuthenticated(result.success);
      })();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current.match(/background/) && nextAppState === "active") {
        setIsAuthenticated(false);
      }

      appState.current = nextAppState;
    });

    return () => {
      if (subscription && subscription.remove) {
        subscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    setIsEnabled(settings.passcodeEnabled);
  }, [settings.passcodeEnabled]);

  const value: PasscodeState = useMemo(
    () => ({
      isAuthenticated,
      isEnabled,
      setIsAuthenticated,
    }),
    [isAuthenticated, isEnabled]
  );

  return (
    <PasscodeContext.Provider value={value}>
      {children}
    </PasscodeContext.Provider>
  );
};

const usePasscode = (): PasscodeState => {
  const context = useContext(PasscodeContext);
  if (context === undefined) {
    throw createMissingProviderError("usePasscode", "PasscodeProvider");
  }
  return context;
};

export { PasscodeProvider, usePasscode };
