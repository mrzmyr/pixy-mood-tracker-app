import { TouchableOpacity, useColorScheme, View } from 'react-native';
import { Check } from 'react-native-feather';
import useHaptics from '../../hooks/useHaptics';
import { LogItem } from '../../hooks/useLogs';
import useScale from '../../hooks/useScale';
import { useSettings } from '../../hooks/useSettings';

export const SlideRatingButton = ({
  rating, selected, onPress
}: {
  rating: LogItem['rating'];
  selected: boolean;
  onPress: () => void;
}) => {
  const haptics = useHaptics();
  const { settings } = useSettings();
  const scale = useScale(settings.scaleType);
  const colorScheme = useColorScheme();

  return (
    <TouchableOpacity
      onPress={async () => {
        await haptics.selection();
        onPress();
      }}
      style={{
        backgroundColor: scale.colors[rating].background,
        borderWidth: 1,
        borderColor: colorScheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        marginBottom: 8,
        width: 120,
        height: 56,
      }}
      activeOpacity={0.7}
    >
      <View style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Check
          color={selected ? scale.colors[rating].text : 'transparent'}
          width={24}
          height={24} />
      </View>
    </TouchableOpacity>
  );
};
