import { Pressable, useColorScheme, View } from 'react-native';
import useColors from '@/hooks/useColors';
import useHaptics from '@/hooks/useHaptics';
import { LogItem } from '@/hooks/useLogs';
import { useSettings } from '@/hooks/useSettings';

export const RatingDot = ({
  rating,
  onPress,
}: {
  rating: LogItem['rating'];
  onPress?: () => void;
}) => {
  const haptics = useHaptics();
  const colors = useColors();
  const { settings } = useSettings();
  const colorScheme = useColorScheme();

  const backgroundColor = colors.scales[settings.scaleType][rating].background;

  return (
    <View
      style={{
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
        borderRadius: 6,
        backgroundColor: backgroundColor,
        width: 32,
        aspectRatio: 1,
        borderWidth: 1,
        borderColor: colorScheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
      }}
    />
  )

};
