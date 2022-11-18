import { View } from "react-native";
import { getLogEditMarginTop } from "../../helpers/responsive";
import { t } from "../../helpers/translation";
import useColors from "../../hooks/useColors";
import { LogItem, RATING_KEYS } from "../../hooks/useLogs";
import { useTemporaryLog } from "../../hooks/useTemporaryLog";
import { SlideHeadline } from "./SlideHeadline";
import { SlideRatingButton } from "./SlideRatingButton";

export const SlideRating = ({
  onChange,
}: {
  onChange: (rating: LogItem['rating']) => void;
}) => {
  const colors = useColors();
  const tempLog = useTemporaryLog();

  const marginTop = getLogEditMarginTop()

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
          {RATING_KEYS.map((key, index) => (
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