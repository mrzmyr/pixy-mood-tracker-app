import dayjs from 'dayjs';
import { Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { Card } from '../../components/Statistics/Card';
import useColors from '../../hooks/useColors';
import { MoodTrendData, SCALE_RANGE, SCALE_TYPE } from '../../hooks/useStatistics/MoodTrendData';
import { useTranslation } from '../../hooks/useTranslation';
import { CardFeedback } from './CardFeedback';

const Chart = ({
  height,
  data,
}: {
  height: number,
  data: MoodTrendData,
}) => {
  const colors = useColors()
  
  const padding = 8;
  const maxY = 6;
  
  const relativeY = (value: number) => {
    return Math.floor(padding + ((height - padding * 2) - (value / maxY) * (height - padding * 2)))
  }
  
  const scaleItemCount = data.ratingsPeriode1.length + data.ratingsPeriode2.length;
  const scaleItems = [
    ...data.ratingsPeriode1,
    ...data.ratingsPeriode2,
  ]
  
  const dots = {}
  data.items.forEach((item, index) => dots[item.date] = item)
  
  const width = (height * 4);
  const itemWidth = width / scaleItemCount;

  console.log('scaleItems', data.avgPeriod1, data.avgPeriod2)
  
  return (
    <Svg
      width={'100%'}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        // backgroundColor: 'yellow',
      }}
    >
      {scaleItems.map((item, index) => {
        const x = Math.floor(index * itemWidth + itemWidth / 2)
        const y = relativeY(item?.value)
        const yNext = scaleItems[index + 1]?.value ? relativeY(scaleItems[index + 1]?.value) : null;

        return item?.value && (
          <>
            {yNext && (
              <Line 
                key={`l-${item.date}`} 
                x1={x} 
                y1={y}
                x2={x + itemWidth}
                y2={yNext}
                stroke={colors.statisticsLineMuted} 
                strokeWidth={2}
              />
            )}
            <Circle
              key={`d-${item.date}`}
              cx={x}
              cy={y}
              r="3"
              strokeWidth={2}
              stroke={item ? colors.statisticsLineMuted : 'red'} 
              fill={colors.statisticsCardBackground}
            />
          </>
        )
      })}
      {/* Line for periode_1 */}
      <Line 
        x1={itemWidth / 2} 
        y1={relativeY(data.avgPeriod1)} 
        x2={data.ratingsPeriode1.length * itemWidth + itemWidth / 2} 
        y2={relativeY(data.avgPeriod1)}
        strokeOpacity={0.8}
        strokeWidth={3}
        stroke={colors.statisticsLinePrimary}
        strokeLinecap="round"
      />
      {/* Line for periode_2 */}
      <Line 
        x1={data.ratingsPeriode1.length * itemWidth + itemWidth / 2} 
        y1={relativeY(data.avgPeriod2)} 
        x2={scaleItemCount * itemWidth - itemWidth / 2}
        y2={relativeY(data.avgPeriod2)} 
        strokeOpacity={0.8}
        strokeWidth={3}
        stroke={colors.tint} 
        strokeLinecap="round"
      />
    </Svg>
  )
}

export const MoodTrend = ({
  data,
}: {
  data: MoodTrendData
}) => {
  const colors = useColors()
  const { t } = useTranslation();
  
  return (
    <Card
      subtitle={t('mood')}
      title={t(`statistics_mood_chart_${data.status}`)}
    >
      <View
        style={{
          justifyContent: 'flex-start',
        }}
      >
        <Chart
          data={data}
          height={100}
        />
        <Text 
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            marginTop: 8,
          }}
        >{SCALE_RANGE}-{SCALE_TYPE} avg</Text>
      </View>
      <CardFeedback type='mood_avg' details={{}} />
    </Card>
  );
};
