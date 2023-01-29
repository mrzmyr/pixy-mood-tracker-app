import useColors from '@/hooks/useColors';
import { SLEEP_QUALITY_KEYS } from '@/hooks/useLogs';
import { Line } from 'react-native-svg';

export const Grid = ({
  width, relativeY,
}) => {
  const colors = useColors();

  return (
    <>
      {SLEEP_QUALITY_KEYS.slice(0, SLEEP_QUALITY_KEYS.length - 1).map((rating, index) => {
        const y = relativeY(index);
        return (
          <Line
            key={`l-${rating}-${index}`}
            x1={0}
            y1={y - 1}
            x2={width}
            y2={y}
            stroke={colors.statisticsGridLine}
            strokeWidth={1}
            strokeDasharray={[4, 4]}
          />
        );
      })}
    </>
  )
};
