import useColors from "@/hooks/useColors";
import { LogItem, SLEEP_QUALITY_MAPPING } from "@/hooks/useLogs";
import { View, ViewStyle, useColorScheme } from "react-native";

export const SleepQualityIndicator = ({
  value,
  style = {},
}: {
  value: LogItem['sleep']['quality'];
  style?: ViewStyle;
}) => {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const sleepQuality = SLEEP_QUALITY_MAPPING[value];
  const height = 32;

  return (
    <View
      style={{
        flex: 5,
        ...style,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.logCardBackground,
          borderColor: colorScheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 16,
          height: height + 32,
          margin: 4,
          aspectRatio: 1,
        }}
      >
        <View
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            height,
            width: 16,
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: 16,
              height,
              backgroundColor: colors.sleepQualityEmpty,
              position: 'absolute',
              bottom: 0,
              zIndex: 1,
            }}
          />
          <View
            style={{
              width: 16,
              height: sleepQuality * 8,
              backgroundColor: colors.sleepQualityFull,
              position: 'absolute',
              bottom: 0,
              zIndex: 1,
            }}
          />
        </View>
      </View>
    </View>
  );
};
