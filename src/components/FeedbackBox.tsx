import { t } from "i18n-js";
import type { ViewStyle } from "react-native";
import { Text, View } from "react-native";
import LinkButton from "./LinkButton";
import useColors from "@/hooks/useColors";
import useFeedbackModal from "@/hooks/useFeedbackModal";

const DEFAULT_STYLE = {};

/**
 * Card that opens the feedback modal with the "idea" type preselected.
 *
 * `prefix` selects the `<prefix>_title`, `<prefix>_body`, and
 * `<prefix>_button` translation keys, which must all exist.
 */
export const FeedbackBox = ({
  prefix,
  style = DEFAULT_STYLE,
}: {
  prefix: string;
  style?: ViewStyle;
}) => {
  const colors = useColors();
  const { show: showFeedbackModal, Modal: FeedbackModal } = useFeedbackModal();

  return (
    <View
      style={{
        marginTop: 16,
        backgroundColor: colors.cardBackground,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 8,
        ...style,
      }}
    >
      <FeedbackModal />
      <Text
        style={{
          fontSize: 17,
          marginBottom: 8,
          fontWeight: "bold",
          color: colors.text,
        }}
      >
        🤨 {t(`${prefix}_title`)}
      </Text>
      <Text
        style={{
          fontSize: 15,
          marginBottom: 16,
          lineHeight: 22,
          color: colors.textSecondary,
        }}
      >
        {t(`${prefix}_body`)}
      </Text>
      <View
        style={{
          flexWrap: "wrap",
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
            showFeedbackModal({ type: "idea" });
          }}
        >
          {t(`${prefix}_button`)}
        </LinkButton>
      </View>
    </View>
  );
};
