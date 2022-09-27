import { View } from 'react-native';
import useColors from '../../../hooks/useColors';
import { LogItem } from '../../../hooks/useLogs';
import { useSettings } from '../../../hooks/useSettings';

export const RatingDot = ({
  rating
}: {
  rating: LogItem['rating'];
}) => {
  const colors = useColors();
  const { settings } = useSettings();

  const backgroundColor = colors.scales[settings.scaleType][rating].background;

  return (
    <View
      style={{
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
        borderRadius: 8,
        backgroundColor: backgroundColor,
        width: 56,
        aspectRatio: 1,
      }} />
  );
};
