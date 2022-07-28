import { useColorScheme, View } from "react-native";
import { VictoryAxis, VictoryChart, VictoryLine } from "victory-native";
import useColors from "../../hooks/useColors";
import useScale from "../../hooks/useScale";
import { useSettings } from "../../hooks/useSettings";
import { getValueFromRating } from "../../lib/Statistics";

export const Chart = ({
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