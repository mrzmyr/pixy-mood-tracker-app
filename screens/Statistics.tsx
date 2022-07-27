import dayjs from 'dayjs';
import { t } from 'i18n-js';
import { useEffect, useState } from 'react';
import { ScrollView, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VictoryAxis, VictoryChart, VictoryLine } from "victory-native";
import Button from '../components/Button';
import useColors from '../hooks/useColors';
import useFeedbackModal from '../hooks/useFeedbackModal';
import { useLogs } from '../hooks/useLogs';
import useScale from '../hooks/useScale';
import { useSettings } from '../hooks/useSettings';
import { getMovingAverage, getValueFromRating } from '../lib/Statistics';

const keys = ['extremely_good', 'very_good', 'good', 'neutral', 'bad', 'very_bad', 'extremely_bad']

const FeedbackSection = () => {
  const colors = useColors()
  const { show: showFeedbackModal, Modal: FeedbackModal } = useFeedbackModal();

  return (
    <View style={{
      marginTop: 32,
      padding: 8,
    }}>
      <FeedbackModal />
      <Text style={{
        fontSize: 17,
        marginBottom: 8,
        fontWeight: 'bold',
        color: colors.text
      }}>⚠️ {t('statistics_experimental_title')}</Text>
      <Text style={{
        fontSize: 15,
        marginBottom: 16,
        lineHeight: 22,
        color: colors.textSecondary
      }}>{t('statistics_experimental_body')}</Text>
      <Button
        onPress={() => {
          showFeedbackModal({ type: 'idea' })
        }}
        type='primary'
      >{t('statistics_experimental_button')}</Button>
    </View>
  )
}

const MonthItem = ({
  index,
  data,
  date,
}) => {
  const { settings } = useSettings()
  const colors = useColors()
  let { colors: scaleColors } = useScale(settings.scaleType)

  return (
    <View
      style={{
        marginBottom:16,
        paddingTop: 12,
        paddingBottom: 16,
        paddingLeft: 16,
        paddingRight: 16,
        backgroundColor: colors.cardBackground,
        borderRadius: 8,
      }}
      testID={`statistics-item-${index}`}
    >
      <Text
        style={{
          fontSize: 17,
          color: colors.text,
          fontWeight: 'bold',
          marginBottom: 24,
        }}
      >{dayjs(date).format('MMMM, YYYY')}</Text>
      {data._total < 1 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              color: colors.textSecondary,
              opacity: 0.5,
              marginBottom: 8,
            }}
          >
            {t('statistics_experimental_not_enough_data')}
          </Text>
        </View>
      ) : (
        <View
          style={{
            flexDirection: 'row',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {keys.map(key => (
            <View
              key={key}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                height: 32,
                width: `${data[key] / data._total * 100}%`,
                backgroundColor: scaleColors[key].background,
              }}
            >
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const ChartTitle = ({ children }) => {
  const colors = useColors()
  
  return (
    <Text
      style={{
        fontSize: 17,
        fontWeight: 'bold',
        color: colors.text,
        padding: 16,
        paddingBottom: 0,
        marginBottom: -24,
      }}
    >{children}</Text>
  )
}

const Chart = ({
  data,
  formatDate,
  yValues
}) => {
  const { settings } = useSettings()
  const colors = useColors()
  const scale = useScale(settings.scaleType)
  const scheme = useColorScheme()
  
  return (
    <View
      style={{
      }}
    >
      <VictoryChart height={200}>
        <VictoryAxis 
          style={{
            grid: {
              stroke: ({ tick }) => {
                for(let i = 0; i < scale.labels.length; i++) {
                  if(tick >= getValueFromRating(scale.labels[i])) {
                    return scale.colors[scale.labels[i]].background
                  }
                }

                return 'transparent'
              },
              strokeWidth: 1,
              opacity: scheme === 'dark' ? 0.3 : 1,
            },
            tickLabels: { fill: colors.text, opacity: 0.5, marginTop: 8, fontSize: 12, fontFamily: 'Helvetica' }
          }}
          dependentAxis 
        />
        <VictoryAxis
          tickFormat={formatDate}
          tickValues={yValues}
          style={{
            // axis: {stroke: "transparent"},
            grid: {
              stroke: colors.text,
              strokeDasharray: '2,2',
              opacity: 0.1,
            },
            tickLabels: { fill: colors.text, opacity: 0.5, marginTop: 8, fontSize: 12, fontFamily: 'Helvetica' }
          }}
        />
        <VictoryLine
          style={{
            data: { 
              stroke: colors.statisticsLine, 
              strokeWidth: 1 
            },
            labels: {
              fontSize: 17,
              fill: colors.text,
            }
          }}
          domain={{ y: [1, 7] }}
          data={data} 
          interpolation={'natural'} 
        />
      </VictoryChart>
    </View>
  )
}

export const StatisticsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const colors = useColors()
  const { state } = useLogs()

  const [chartData7days, setChartData7days] = useState([])
  const [chartData30days, setChartData30days] = useState([])
  const [chartData90days, setChartData90days] = useState([])
  
  const weekDays = []
  const weekStart = dayjs().startOf('week');
  for(let i = 0; i < 4; i++) {
    weekDays.push(weekStart.subtract(i, 'week').format('YYYY-MM-DD'))
  }

  useEffect(() => {
    if(Object.keys(state.items).length < 1) {
      return;
    }
    
    const data = {}

    for(let i = 0; i < 90; i++) {
      const date1 = dayjs().subtract(i, 'days').format('YYYY-MM-DD')
      data[date1] = {}
      data[date1].date = date1
      data[date1].dates = {}
      data[date1].values = []
      for(let j = 0; j < 7; j++) {
        const date2 = dayjs().subtract(i + j, 'days').format('YYYY-MM-DD')
        const value = getValueFromRating(state.items[date2]?.rating);
        data[date1].dates[date2] = value
        data[date1].values.push(value)
      }
      const filteredValues7days = data[date1].values.slice(0, 7).filter(v => v !== null)
      const filteredValues14days = data[date1].values.slice(0, 14).filter(v => v !== null)
      const filteredValues30days = data[date1].values.slice(0, 30).filter(v => v !== null)
      const filteredValues90days = data[date1].values.slice(0, 90).filter(v => v !== null)
  
      data[date1].movingAverage7days = getMovingAverage(filteredValues7days, filteredValues7days.length)
      data[date1].movingAverage14days = getMovingAverage(filteredValues14days, filteredValues14days.length)
      data[date1].movingAverage30days = getMovingAverage(filteredValues30days, filteredValues30days.length)
      data[date1].movingAverage90days = getMovingAverage(filteredValues90days, filteredValues90days.length)
    }
    
    setChartData7days(Object.keys(data).slice(0, 7).map(d => ({
      x: new Date(data[d].date),
      y: data[d].movingAverage7days
    })))

    setChartData30days(Object.keys(data).slice(0, 30).map(d => ({
      x: new Date(data[d].date),
      y: data[d].movingAverage30days
    })))

    setChartData90days(Object.keys(data).slice(0, 90).map(d => ({
      x: new Date(data[d].date),
      y: data[d].movingAverage90days
    })))
    
  }, [state])
  
  const monthStarts = [
    dayjs().startOf('month').subtract(2, 'month'),
    dayjs().startOf('month').subtract(1, 'month'),
    dayjs().startOf('month'),
  ].map(d => d.toDate())

  const weekStarts = [
    dayjs().startOf('week').subtract(3, 'week'),
    dayjs().startOf('week').subtract(2, 'week'),
    dayjs().startOf('week').subtract(1, 'week'),
    dayjs().startOf('week'),
  ].map(d => d.toDate())

  const dayStarts = [
    dayjs().startOf('day').subtract(6, 'day'),
    dayjs().startOf('day').subtract(5, 'day'),
    dayjs().startOf('day').subtract(4, 'day'),
    dayjs().startOf('day').subtract(3, 'day'),
    dayjs().startOf('day').subtract(2, 'day'),
    dayjs().startOf('day').subtract(1, 'day'),
    dayjs().startOf('day'),
  ].map(d => d.toDate())
  
  return (
    <View
      style={{
        paddingTop: insets.top,
        flex: 1,
        backgroundColor: colors.statisticsBackground
      }}
    >
      <ScrollView style={{
        padding: 20,
      }}>
        <View
          style={{
            flex: 1,
            paddingBottom: insets.bottom + 50,
          }}
        >
          <Text
            style={{
              fontSize: 32,
              color: colors.text,
              fontWeight: 'bold',
              marginTop: 32,
              marginBottom: 24,
            }}
          >{t('statistics_title')}</Text>

            {/* 30 days */}
            <View
              style={{
                borderRadius: 8,
                backgroundColor: colors.statisticsCardBackground,
                marginBottom: 16,
              }}
            >
              <ChartTitle>Last 7 days</ChartTitle>
              {chartData7days && (
                <Chart 
                  data={chartData7days} 
                  formatDate={d => dayjs(d).format('ddd')} 
                  yValues={dayStarts}
                />
              )}
            </View> 

            <View
              style={{
                borderRadius: 8,
                backgroundColor: colors.statisticsCardBackground,
                marginBottom: 16,
              }}
            >
              <ChartTitle>Last 30 days</ChartTitle>
              {chartData30days && (
                <Chart 
                  data={chartData30days} 
                  formatDate={d => dayjs(d).format('DD. MMM')} 
                  yValues={weekStarts}
                />
              )}
            </View>

            <View
              style={{
                borderRadius: 8,
                backgroundColor: colors.statisticsCardBackground,
              }}
            >
              <ChartTitle>Last 90 days</ChartTitle>
              {chartData30days && (
                <Chart 
                  data={chartData90days} 
                  formatDate={d => dayjs(d).format('MMMM')} 
                  yValues={monthStarts}
                />
              )}
            </View>

          <FeedbackSection />
        </View>
      </ScrollView>
    </View>
  );
}
