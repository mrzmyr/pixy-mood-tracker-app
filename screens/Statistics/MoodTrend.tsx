import dayjs from 'dayjs';
import _ from 'lodash';
import { View } from 'react-native';
import Svg, { Circle, Line, Rect, Text } from 'react-native-svg';
import { Card } from '../../components/Statistics/Card';
import useColors from '../../hooks/useColors';
import { LogItem } from '../../hooks/useLogs';
import { useTranslation } from '../../hooks/useTranslation';
import { CardFeedback } from './CardFeedback';

export const keys = ['extremely_good', 'very_good', 'good', 'neutral', 'bad', 'very_bad', 'extremely_bad']

const RATING_MAPPING = {
  extremely_good: 6,
  very_good: 5,
  good: 4,
  neutral: 3,
  bad: 2,
  very_bad: 1,
  extremely_bad: 0,
}

const getNextDot = (date, days, data) => {
  for(let i = 1; i < days.length; i++) {
    const currentDate = dayjs(date).add(i, 'day').format('YYYY-MM-DD')
    const item = data[currentDate]
    
    if(item) {
      return {
        ...item,
        xIndex: i,
      }
    }
  }

  return null;
}

const Chart = ({
  height,
  data,
}: {
  height: number,
  data: (LogItem & { value: number })[],
}) => {
  const colors = useColors()
  
  const padding = 8;
  const maxY = 6;
  
  const relativeY = (value: number) => {
    return padding + ((height - padding * 2) - (value / maxY) * (height - padding * 2))
  }
  
  const days = []
  for (let i = 14; i >= 0; i--) {
    days.push(dayjs().subtract(i, 'day').format('YYYY-MM-DD'))
  }
  
  const dots = {}
  data.forEach((item, index) => dots[item.date] = item)

  const items_periode_1 = data
    .filter(item => (
      dayjs(item.date).isAfter(dayjs().subtract(14, 'day')) && 
      dayjs(item.date).isBefore(dayjs().subtract(7, 'day'))
    ))
    .map(item => ({
      ...item,
      value: RATING_MAPPING[item.rating],
    }))

  const items_periode_2 = data
    .filter(item => dayjs(item.date).isAfter(dayjs().subtract(7, 'day')))
    .map(item => ({
      ...item,
      value: RATING_MAPPING[item.rating],
    }))
  
  const avg_periode_1 = items_periode_1.reduce((acc, item) => acc + item.value, 0) / items_periode_1.length
  const avg_periode_2 = items_periode_2.reduce((acc, item) => acc + item.value, 0) / items_periode_2.length
  
  const width = (height * 3);
  const itemWidth = width / days.length;
  
  return (
    <Svg
      width={'100%'}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {days.map((dateString, index) => {
        const item = data.find(item => item.date === dateString)
        const nextDot = getNextDot(dateString, days, dots)
        const x = Math.floor(index * itemWidth + itemWidth / 2)
        const y = relativeY(item?.value)

        return item && (
          <>
            {nextDot && (
              <Line 
                key={`l-${dateString}`} 
                x1={x} 
                y1={y}
                x2={x + (itemWidth * nextDot.xIndex)}
                y2={relativeY(nextDot?.value)}
                stroke={colors.statisticsLineMuted} 
                strokeWidth={2}
              />
            )}
            <Circle
              key={`d-${dateString}`}
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
        x1={itemWidth} 
        y1={relativeY(avg_periode_1)} 
        x2={items_periode_1.length * itemWidth} 
        y2={relativeY(avg_periode_1)} 
        strokeOpacity={0.8}
        strokeWidth={3}
        stroke={colors.statisticsLinePrimary}
        strokeLinecap="round"
      />
      {/* Line for periode_2 */}
      <Line 
        x1={items_periode_1.length * itemWidth} 
        y1={relativeY(avg_periode_2)} 
        x2={days.length * itemWidth - itemWidth / 2}
        y2={relativeY(avg_periode_2)} 
        strokeOpacity={0.8}
        strokeWidth={3}
        stroke={colors.tint} 
        strokeLinecap="round"
      />
    </Svg>
  )
}

export const MoodTrend = ({
  items,
}: {
  items: LogItem[]
}) => {
  const { t } = useTranslation();

  const items_periode_1 = items
    .filter(item => (
      dayjs(item.date).isAfter(dayjs().subtract(14, 'day')) && 
      dayjs(item.date).isBefore(dayjs().subtract(7, 'day'))
    ))
    .map(item => ({
      ...item,
      value: RATING_MAPPING[item.rating],
    }))

  const items_periode_2 = items
    .filter(item => dayjs(item.date).isAfter(dayjs().subtract(7, 'day')))
    .map(item => ({
      ...item,
      value: RATING_MAPPING[item.rating],
    }))

  const avg_periode_1 = items_periode_1.reduce((acc, item) => acc + item.value, 0) / items_periode_1.length
  const avg_periode_2 = items_periode_2.reduce((acc, item) => acc + item.value, 0) / items_periode_2.length

  const diff = Math.abs(avg_periode_1 - avg_periode_2)

  if(diff < 0.7 || items.length < 10) {
    return null;
  }
  
  return (
    <Card
      subtitle={t('mood')}
      title={t(`statistics_mood_chart_${avg_periode_1 < avg_periode_2 ? 'improved' : 'declined'}`)}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Chart
          data={items.map(item => ({
            ...item,
            value: RATING_MAPPING[item.rating],
          }))}
          height={100}
        />
      </View>
      <CardFeedback type='mood_avg' details={{}} />
    </Card>
  );
};
