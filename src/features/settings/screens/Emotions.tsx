import { ScrollView, View } from "react-native";
import LinkButton from "@/components/LinkButton";
import { useFeedbackModal } from "@/features/feedback";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { StepSwitch } from "../components/StepSwitch";

/**
 * Settings > Check-in > Emotions: the step switch plus a request link for
 * emotions the list misses. Requests go out as `emotion` feedback.
 */
export const SettingsEmotions = () => {
  const colors = useColors();
  const { Modal: FeedbackModal, show: showFeedbackModal } = useFeedbackModal();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FeedbackModal />
      <ScrollView>
        <StepSwitch step="emotions" />
        <View
          style={{
            marginHorizontal: 16,
            flexDirection: "row",
          }}
        >
          <LinkButton
            type="secondary"
            testID="request-emotion"
            onPress={() => showFeedbackModal({ type: "emotion" })}
            style={{
              fontWeight: "400",
            }}
          >
            {t("request_emotion")}
          </LinkButton>
        </View>
      </ScrollView>
    </View>
  );
};
