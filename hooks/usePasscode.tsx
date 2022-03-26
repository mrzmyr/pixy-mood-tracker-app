import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useSettings } from './useSettings';

const PasscodeContext = createContext(undefined)

interface PasscodeState {
  isAuthenticated: boolean
  setIsAuthenticated: (isAuthenticated: boolean) => void
  isEnabled: boolean
}

function PasscodeProvider({
  children
}: {
  children: React.ReactNode
}) {
  const { settings } = useSettings()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        setIsAuthenticated(false)
      }

      appState.current = nextAppState;
      setAppStateVisible(appState.current);
      console.log("AppState", appState.current);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const value: PasscodeState = {
    isAuthenticated,
    isEnabled: settings.passcodeEnabled,
    setIsAuthenticated,
  };

  return (
    <PasscodeContext.Provider value={value}>
      {children}
    </PasscodeContext.Provider>
  )
}

function usePasscode(): PasscodeState {
  const context = useContext(PasscodeContext)
  if (context === undefined) {
    throw new Error('useLogs must be used within a LogsProvider')
  }
  return context
}

export { PasscodeProvider, usePasscode };
