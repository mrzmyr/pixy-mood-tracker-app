import { PasscodeView } from '../components/PasscodeView';
import { usePasscode } from '../hooks/usePasscode';
import { useSegment } from '../hooks/useSegment';
import { useSettings } from '../hooks/useSettings';

export const PasscodeScreen = () => {
  const passcode = usePasscode()
  const { settings } = useSettings()
  const segment = useSegment()

  return (
    <PasscodeView
      mode='confirm'
      onSubmit={(code) => {
        if(settings.passcode !== code) {
          segment.track('passcode_failed');
          return false;
        }

        segment.track('passcode_confirmed');
        
        passcode.setIsAuthenticated(true)
        return true;
      }}
    />
  );
}
