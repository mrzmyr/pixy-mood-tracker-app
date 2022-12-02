import { useCallback, useState } from 'react';
import { Modal, Platform, SafeAreaView } from 'react-native';
import { PasscodeView } from '@/components/PasscodeView';
import useColors from './useColors';
import { useAnalytics } from './useAnalytics';

export default function usePasscodeModal({
  mode,
  visible = false,
  onSubmit,
}: {
  mode: 'create' | 'confirm',
  visible?: boolean,
  onSubmit: (code: string) => boolean;
}) {
  const colors = useColors()
  const [isVisibile, setIsVisibile] = useState(visible)
  const analytics = useAnalytics()

  const show = () => {
    analytics.track('passcode_modal_show')
    setIsVisibile(true)
  }

  const hide = () => {
    analytics.track('passcode_modal_hide')
    setIsVisibile(false)
  }

  const ModalElement = useCallback(() => {
    return (
      <Modal
        animationType={Platform.OS === 'web' || mode === 'confirm' ? 'none' : 'slide'}
        presentationStyle='fullScreen'
        visible={isVisibile}
        style={{
          position: 'relative'
        }}
      >
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: colors.backgroundSecondary,
          }}
        >
          <PasscodeView
            mode={mode}
            onClose={hide}
            onSubmit={onSubmit}
          />
        </SafeAreaView>
      </Modal>
    );
  }, [isVisibile])

  return {
    Modal: ModalElement,
    show,
    hide,
    isVisibile
  };
}
