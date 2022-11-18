import Svg, { Circle, Path, Polyline, Rect, Use } from 'react-native-svg';
import useColors from '../../hooks/useColors';
import { RATING_KEYS } from '../../hooks/useLogs';
import useScale from '../../hooks/useScale';
import { Grid } from './Grid';
import { XLabels } from './XLabels';
import { YLabels } from './YLabels';

export const RatingChart = ({
  data,
  height,
  width,
}: {
  height: number;
  width: number;
  data: {
    key: string;
    count: number;
    value: number | null;
  }[];
}) => {
  const colors = useColors();

  const paddingRight = 16;
  const maxY = 6;

  const scaleItemCount = data.length;
  const scaleItems = data.map(d => ({
    ...d,
    value: d.value !== null ? Math.round(d.value) : null,
  }));

  const XLegendHeight = 32;
  const YLegendWidth = 32;

  const _height = Math.round(height / RATING_KEYS.length) * RATING_KEYS.length;
  const _width = width - YLegendWidth - paddingRight;

  const rowHeight = Math.round(height / RATING_KEYS.length);
  const outerHeight = _height + XLegendHeight + rowHeight * 1;
  const outerWidth = width;

  const itemWidth = _width / (scaleItemCount);

  const relativeY = (value: number) => {
    return Math.floor(((_height) - (value / maxY) * (_height)))
  };

  const relativeX = (index: number) => {
    return Math.floor(index * itemWidth + itemWidth / 2) + YLegendWidth;
  };

  const polygonPoints = scaleItems.map((item, index) => {
    if (item.value === null) {
      return null;
    }

    const x = Math.round(relativeX(index));
    const y = Math.round(relativeY(item.value || 0)) + rowHeight / 2;

    return `${x},${y}`;
  }).filter(Boolean).join(' ');

  return (
    <Svg
      width={'100%'}
      height={outerHeight}
      viewBox={`0 0 ${outerWidth} ${outerHeight}`}
      style={{}}
    >
      {/* <Rect
        x={0}
        y={0}
        width={width}
        height={outerHeight}
        fill={'rgba(255, 255, 0, 0.1)'}
      /> */}
      {/*
      <Rect
        x={0}
        y={0}
        width={YLegendWidth}
        height={outerHeight}
        fill={'rgba(255, 0, 0, 0.2)'}
      />
      <Rect
        x={0}
        y={outerHeight - XLegendHeight}
        width={width}
        height={XLegendHeight}
        fill={'rgba(0, 255, 0, 0.2)'}
      /> */}

      <YLabels
        relativeY={relativeY}
        YLegendWidth={YLegendWidth}
        rowHeight={rowHeight}
        width={outerWidth}
      />

      <XLabels
        items={scaleItems}
        x={index => relativeX(index)}
        y={outerHeight - XLegendHeight / 2}
      />

      <Grid
        width={width}
        relativeY={relativeY}
      />

      <Polyline
        fill="none"
        stroke={colors.statisticsLinePrimary}
        strokeWidth="2"
        strokeLinejoin='round'
        points={polygonPoints}
      />

      {scaleItems.map((item, index) => {
        if (item.value === null) return;

        const x = relativeX(index);
        const y = relativeY(item.value);

        return (
          <>
            <Circle
              id={`c-${item.key}`}
              key={`d-${item.key}`}
              cx={x}
              cy={y + rowHeight / 2}
              r="3"
              strokeWidth={2}
              stroke={colors.statisticsLinePrimary}
              fill={colors.cardBackground}
            />
          </>
        );
      })}
    </Svg>
  );
};
