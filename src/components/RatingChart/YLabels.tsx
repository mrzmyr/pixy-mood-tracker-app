import { Rect } from 'react-native-svg';
import { RATING_KEYS, RATING_MAPPING } from '@/hooks/useLogs';
import useScale from '@/hooks/useScale';

export const YLabels = ({
  relativeY, YLegendWidth, rowHeight, width
}) => {
  const scale = useScale();

  return (
    <>
      {[...RATING_KEYS].reverse().map((rating, index) => {
        const y = relativeY(index);
        return (
          <Rect
            key={`ylabel-${rating}-${index}`}
            x={(YLegendWidth - 20) / 2}
            y={y + rowHeight / 2 / 2}
            width={20}
            height={rowHeight / 2}
            fill={scale.colors[rating].background}
            rx={4} />
        );
      })}
      {/* {[...RATING_KEYS.reverse()].map((rating, index) => {
        const y = relativeY(index);
        return (
          <Rect
            key={`ylabel-rect-${rating}-${index}`}
            x={0}
            y={y}
            width={width}
            height={rowHeight + 4}
            fill={scale.colors[rating].background}
            rx={rating === RATING_KEYS[0] || rating === RATING_KEYS[RATING_KEYS.length - 1] ? 4 : 0}
            opacity={0.1}
          />
        );
      })} */}
    </>
  );
};
