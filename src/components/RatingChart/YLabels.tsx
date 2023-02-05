import { RATING_KEYS } from '@/hooks/useLogs';
import useScale from '@/hooks/useScale';
import { Rect } from 'react-native-svg';

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
    </>
  );
};
