/* istanbul ignore file */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const useHaptics = () => {
  return {
    selection: async () => {
      if(Platform.OS === 'ios') {
        await Haptics.selectionAsync();
      }
    }
  }
}

export default useHaptics;