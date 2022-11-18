import { t } from 'i18n-js';
import { Text, View } from 'react-native';
import Button from '../../components/Button';
import LinkButton from '../../components/LinkButton';
import useColors from '../../hooks/useColors';
import useFeedbackModal from '../../hooks/useFeedbackModal';

export const FeedbackSection = () => {
  const colors = useColors();
  const { show: showFeedbackModal, Modal: FeedbackModal } = useFeedbackModal();

  return (
    <View
      style={{
        marginTop: 32,
        backgroundColor: colors.cardBackground,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 8,
      }}
    >
      <FeedbackModal />
      <Text style={{
        fontSize: 17,
        marginBottom: 8,
        fontWeight: 'bold',
        color: colors.text
      }}>🤨 {t('statistics_experimental_title')}</Text>
      <Text style={{
        fontSize: 15,
        marginBottom: 16,
        lineHeight: 22,
        color: colors.textSecondary
      }}>{t('statistics_experimental_body')}</Text>
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
          style={{
          }}
          onPress={() => {
            showFeedbackModal({ type: 'idea' });
          }}
        >{t('statistics_experimental_button')}</LinkButton>
      </View>
    </View>
  );
};
