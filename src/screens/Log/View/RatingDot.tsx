import { Pressable, View } from 'react-native';
import useColors from '../../../hooks/useColors';
import useHaptics from '../../../hooks/useHaptics';
import { LogItem } from '../../../hooks/useLogs';
import { useSettings } from '../../../hooks/useSettings';

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

  const backgroundColor = colors.scales[settings.scaleType][rating].background;

  return (
    <Pressable
      onPress={async () => {
        if (onPress) {
          await haptics.selection()
          onPress();
        }
      }}
    >
      <View
        style={{
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 4,
          borderRadius: 8,
          backgroundColor: backgroundColor,
          width: 46,
          aspectRatio: 1,
        }}
      />
    </Pressable>
  )

};
