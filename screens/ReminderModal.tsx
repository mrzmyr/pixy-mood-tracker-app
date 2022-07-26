import { Text, View } from 'react-native';
import LinkButton from '../components/LinkButton';
import ModalHeader from '../components/ModalHeader';
import Reminder from '../components/Reminder';
import useColors from '../hooks/useColors';
import { useSegment } from '../hooks/useSegment';
import { useTranslation } from '../hooks/useTranslation';
import { RootStackScreenProps } from '../types';

export const ReminderModal = ({ navigation }: RootStackScreenProps<'ReminderModal'>) => {
  const colors = useColors()
  const { t } = useTranslation()
  const segment = useSegment()

  const close = () => {
    segment.track('reminder_modal_close')
    navigation.navigate('Calendar');
  }
  
  return (
    <View style={{
      flex: 1,
      justifyContent: 'flex-start',
      backgroundColor: colors.background,
    }}>
      <ModalHeader
        left={
          <LinkButton 
            testID='reminder-modal-cancel' 
            onPress={close} 
            type='primary'
          >{t('cancel')}</LinkButton>
        }
        right={
          <LinkButton
            testID='reminder-modal-save'
            onPress={close}
            type='primary'
            textStyle={{
              fontWeight: 'bold',
            }}
          >{t('save')}</LinkButton>
        }
      />
      <View
        style={{
          width: '100%',
          height: '100%',
          justifyContent: 'space-around',
          padding: 16,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 38,
              fontWeight: 'bold',
              color: colors.text,
              textAlign: 'center',
            }}
          >{t('reminder_modal_title')}</Text>
          <Text
            style={{
              fontSize: 17,
              color: colors.text,
              textAlign: 'center',
              marginTop: '5%',
              marginLeft: 'auto',
              marginRight: 'auto',
              width: '80%',
              marginBottom: '20%',
            }}
          >{t('reminder_modal_body')}</Text>
          <Reminder />
        </View>
        <View>
          <Text
              style={{
                fontSize: 15,
                color: colors.textSecondary,
                opacity: 0.5,
                textAlign: 'center',
                marginLeft: 'auto',
                marginRight: 'auto',
                width: '80%',
              }}
            >{t('reminder_modal_footer')}</Text>
        </View>
      </View>
    </View>
  );
}
