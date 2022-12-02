import { View } from 'react-native';
import useColors from '../../hooks/useColors';
import { RATING_KEYS } from '../../hooks/useLogs';
import { ColorDot } from './ColorDot';

export function Scale({
  type,
}: {
  type: string;
}) {
  const colors = useColors();
  const scaleColors = colors.scales[type];
  const scaleKeys = RATING_KEYS.slice().reverse()

  return (
    <View
      style={{
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {scaleKeys.map((key, index) => (
        <ColorDot
          key={key}
          color={scaleColors[key].background} />
      ))}
    </View>
  );
}
