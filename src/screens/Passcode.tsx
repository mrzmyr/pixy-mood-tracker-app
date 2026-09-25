import { PasscodeView } from "@/components/PasscodeView";
import { usePasscode } from "../hooks/usePasscode";
import { useAnalytics } from "../hooks/useAnalytics";
import { useSettings } from "../hooks/useSettings";

/**
 * Passcode confirmation screen. Not registered in navigation while the
 * passcode lock is disabled.
 */
export const PasscodeScreen = () => {
  const passcode = usePasscode();
  const { settings } = useSettings();
  const analytics = useAnalytics();

  return (
    <PasscodeView
      mode="confirm"
      onSubmit={(code) => {
        if (settings.passcode !== code) {
          analytics.track("passcode_failed");
          return false;
        }

        analytics.track("passcode_confirmed");

        passcode.setIsAuthenticated(true);
        return true;
      }}
      onClose={() => {
        passcode.setIsAuthenticated(false);
      }}
    />
  );
};
