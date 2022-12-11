import { Text, View, ViewStyle } from "react-native";
import LinkButton from "@/components/LinkButton";
import { t } from "@/helpers/translation";
import useColors from "../../hooks/useColors";
import useFeedbackModal from "../../hooks/useFeedbackModal";

export const FeedbackBox = ({
  prefix,
  style = {},
  emoji = '',
}: {
  prefix: string;
  style?: ViewStyle;
  emoji?: string;
}) => {
  const colors = useColors();
  const { show: showFeedbackModal, Modal: FeedbackModal } = useFeedbackModal();

  return (
    <View
      style={{
      }}
    >
      <View
        style={{
          marginBottom: 24,
          backgroundColor: colors.feedbackBoxBackground,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          paddingVertical: 16,
          paddingHorizontal: 20,
          borderRadius: 8,
          ...style,
        }}
      >
        <FeedbackModal />
        <Text style={{
          fontSize: 17,
          marginBottom: 8,
          fontWeight: 'bold',
          color: colors.text
        }}>{emoji ? `${emoji} ` : ''}{t(`${prefix}_title`)}</Text>
        <Text style={{
          fontSize: 17,
          marginBottom: 16,
          lineHeight: 24,
          color: colors.textSecondary
        }}>{t(`${prefix}_body`)}</Text>
        <View
          style={{
            flexWrap: 'wrap',
            marginHorizontal: -20,
            paddingHorizontal: 12,
            marginBottom: -16,
            paddingBottom: 8,
            paddingTop: 8,
            borderTopColor: colors.cardBorder,
            borderTopWidth: 1,
          }}
        >
          <LinkButton
            style={{}}
            onPress={() => {
              showFeedbackModal({ type: 'idea' });
            }}
          >{t(`give_feedback`)}</LinkButton>
        </View>
      </View>
    </View>
  );
};
