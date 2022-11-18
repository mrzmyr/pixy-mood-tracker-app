import { Text } from 'react-native-svg';
import useColors from '../../hooks/useColors';

export const XLabels = ({
  items,
  x,
  y,
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

  return items.map((item, index) => {
    const _x = x(index);

    const Label = (
      <>
        <Text
          x={_x}
          y={y}
          fontSize="14"
          fill={colors.statisticsLegendText}
          textAnchor="middle"
          alignmentBaseline='center'
        >
          {item.key}
        </Text>
      </>
    );

    return shouldLabel(index) ? Label : null;
  });
};
