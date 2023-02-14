import { SlideSleepButton } from "@/components/Logger/slides/SlideSleepButton";
import { t } from "@/helpers/translation";
import useColors from "@/hooks/useColors";
import { SLEEP_QUALITY_KEYS } from "@/hooks/useLogs";
import { Text, View } from "react-native";

export const SleepQualityAnswer = ({
  onPress
}: {
  onPress: (key: string) => void;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: 'row',
      }}
    >
      <View
        style={{
          alignItems: 'center',
          width: '100%',
          justifyContent: 'center',
          borderRadius: 12,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {SLEEP_QUALITY_KEYS.slice().reverse().map((key, index) => (
            <SlideSleepButton
              key={key}
              value={key}
              selected={false}
              onPress={() => {
                onPress(key);
              }}
            />
          ))}
        </View>
        <View
          style={{
            width: '100%',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 4,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: 'center',
                flex: 5,
              }}
            >{t('logger_step_sleep_low')}</Text>
            <View style={{ flex: 5 }} />
            <View style={{ flex: 5 }} />
            <View style={{ flex: 5 }} />
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: 'center',
                flex: 5,
              }}
            >{t('logger_step_sleep_high')}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};
