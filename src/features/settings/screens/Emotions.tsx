import { ScrollView, View } from "react-native";
import { MessageCircle } from "lucide-react-native";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import { useFeedbackModal } from "@/features/feedback";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { StepSwitch } from "../components/StepSwitch";

/**
 * Settings > Check-in > Emotions: the step switch plus a request form for
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
        <View style={{ marginTop: 16, marginHorizontal: 16 }}>
          <MenuList>
            <MenuListItem
              title={t("request_emotion")}
              iconLeft={<MessageCircle size={20} color={colors.text} />}
              onPress={() => showFeedbackModal({ type: "emotion" })}
              testID="request-emotion"
            />
          </MenuList>
        </View>
      </ScrollView>
    </View>
  );
};
