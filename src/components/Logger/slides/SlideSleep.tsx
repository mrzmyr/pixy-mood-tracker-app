import LinkButton from "@/components/LinkButton";
import { getLogEditMarginTop } from "@/helpers/responsive";
import { t } from "@/helpers/translation";
import useColors from "@/hooks/useColors";
import { LogItem, SLEEP_QUALITY_KEYS } from "@/hooks/useLogs";
import { useTemporaryLog } from "@/hooks/useTemporaryLog";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SlideHeadline } from "../components/SlideHeadline";
import { Footer } from "./Footer";
import { SlideSleepButton } from "./SlideSleepButton";

export const SlideSleep = ({
  onChange,
  showDisable,
  onDisableStep,
}: {
  onChange: (rating: LogItem['rating']) => void;
  showDisable: boolean;
  onDisableStep: () => void;
}) => {
  const colors = useColors();
  const tempLog = useTemporaryLog();
  const insets = useSafeAreaInsets();

  const marginTop = getLogEditMarginTop()

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.logBackground,
      width: '100%',
      position: 'relative',
      paddingHorizontal: 20,
      paddingBottom: insets.bottom + 20,
    }}>
      <View
        style={{
          flex: 1,
          marginTop
        }}
      >
        <SlideHeadline
          style={{
          }}
        >{t('log_sleep_question')}</SlideHeadline>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 32,
            width: '100%',
          }}
        >
          {SLEEP_QUALITY_KEYS.slice().reverse().map((key, index) => (
            <SlideSleepButton
              key={key}
              value={key}
              selected={tempLog?.data?.sleep?.quality === key}
              onPress={() => onChange(key)}
            />
          ))}
        </View>
        <Footer>
          {showDisable && (
            <LinkButton
              type="secondary"
              onPress={onDisableStep}
              style={{
                fontWeight: '400',
              }}
            >{t('log_tags_disable')}</LinkButton>
          )}
        </Footer>
      </View>
    </View>
  )
}