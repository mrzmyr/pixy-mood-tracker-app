import { t } from 'i18n-js';
import { Text, View } from 'react-native';
import Button from '../../components/Button';
import useColors from '../../hooks/useColors';
import useFeedbackModal from '../../hooks/useFeedbackModal';

export const FeedbackSection = () => {
  const colors = useColors();
  const { show: showFeedbackModal, Modal: FeedbackModal } = useFeedbackModal();

  return (
    <View style={{
    }}>
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
      <Button
        onPress={() => {
          showFeedbackModal({ type: 'idea' });
        }}
        type='primary'
      >{t('statistics_experimental_button')}</Button>
    </View>
  );
};
