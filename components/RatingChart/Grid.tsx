import { Line } from 'react-native-svg';
import useColors from '../../hooks/useColors';
import { RATING_MAPPING } from '../../hooks/useLogs';

export const Grid = ({
  width, relativeY,
}) => {
  const colors = useColors();
  const keys = Object.keys(RATING_MAPPING);

  return (
    <>
      {keys.slice(0, keys.length - 1).map((rating, index) => {
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
