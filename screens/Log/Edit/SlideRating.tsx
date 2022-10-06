import { View } from "react-native";
import useColors from "../../../hooks/useColors";
import { LogItem } from "../../../hooks/useLogs";
import { useTemporaryLog } from "../../../hooks/useTemporaryLog";
import { useTranslation } from "../../../hooks/useTranslation";
import { SlideHeadline } from "./SlideHeadline";
import { SlideRatingButton } from "./SlideRatingButton";

const keys = [
  'extremely_good',
  'very_good',
  'good',
  'neutral',
  'bad',
  'very_bad',
  'extremely_bad',
]

export const SlideRating = ({
  marginTop,
  onChange,
}: {
  marginTop: number;
  onChange: (rating: LogItem['rating']) => void;
}) => {
  const colors = useColors();
  const tempLog = useTemporaryLog();
  const { t } = useTranslation()
  
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: colors.logBackground,
      width: '100%',
    }}>
      <View
        style={{
          flex: 1,
          marginTop
        }}
      >
        <View
          style={{
            width: '100%',
            alignItems: 'center',
          }}
        >
          <SlideHeadline>{t('log_rating_question')}</SlideHeadline>
        </View>
        <View
          style={{
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 32,
            width: '100%',
          }}
        >
          {keys.map((key, index) => (
            <SlideRatingButton
              key={key}
              rating={key as LogItem['rating']}
              selected={tempLog?.data?.rating === key} 
              onPress={() => onChange(key as LogItem['rating'])}
            />
          ))}
        </View>
      </View>
    </View>
  )
}