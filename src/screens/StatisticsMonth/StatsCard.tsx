import { Text, View, ViewStyle } from 'react-native';
import useColors from '../../hooks/useColors';


export const StatsCard = ({
  title, subtitle, style, trendType, trendValue,
}: {
  title: string;
  subtitle: string;
  style?: ViewStyle;
  trendType?: 'up' | 'down';
  trendValue?: number;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 8,
        padding: 16,
        ...style,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
        }}
      >
        <View
          style={{
            width: '100%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              marginBottom: 4,
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <Text style={{
              fontSize: 20,
              color: colors.text,
              fontWeight: 'bold',
              marginRight: 4,
            }}>{title}</Text>
            {trendValue !== 0 && (
              <Text style={{
                fontSize: 14,
                color: trendType === 'up' ? colors.palette.green[500] : colors.palette.red[500],
              }}>{trendType === 'up' ? '+' : '-'}{trendValue}</Text>
            )}
          </View>
          <Text style={{
            fontSize: 14,
            color: colors.textSecondary,
            fontWeight: 'bold',
          }}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
};
