import { Text } from 'react-native-svg';
import { ScaleItem } from '.';
import useColors from '@/hooks/useColors';

export const XLabels = ({
  items,
  x,
  y,
}: {
  items: ScaleItem[],
  x: (index: number) => number,
  y: number,
}) => {
  const colors = useColors();

  const shouldLabel = (index) => {
    if (items.length > 15) {
      return index % 3 === 0;
    }

    if (items.length > 12) {
      return index % 2 === 0;
    }

    return true;
  }

  return (
    <>
      {items.map((item, index) => {
        const _x = x(index);

        const Label = (
          // @ts-ignore
          <Text
            x={_x}
            y={y}
            fontSize="14"
            fill={colors.statisticsLegendText}
            textAnchor="middle"
            alignmentBaseline='center'
            key={`xlabel-${index}`}
          >
            {item.key}
          </Text>
        );

        return shouldLabel(index) ? Label : null;
      })}
    </>
  );
};
