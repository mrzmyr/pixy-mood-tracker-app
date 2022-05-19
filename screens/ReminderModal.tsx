import { Platform, StatusBar, Text, View } from 'react-native';
import { X } from 'react-native-feather';
import LinkButton from '../components/LinkButton';
import ModalHeader from '../components/ModalHeader';
import Reminder from '../components/Reminder';
import useColors from '../hooks/useColors';
import { useSegment } from '../hooks/useSegment';
import { useTranslation } from '../hooks/useTranslation';
import { RootStackScreenProps } from '../types';

export const ReminderModal = ({ navigation }: RootStackScreenProps<'ReminderModal'>) => {
  const colors = useColors()
  const i18n = useTranslation()
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
      paddingTop: 20 + (Platform.OS === 'android' ? StatusBar.currentHeight : 0),
      paddingBottom: 20,
      paddingLeft: 20,
      paddingRight: 20,
    }}>
      <ModalHeader
        left={<LinkButton testID='reminder-modal-cancel' onPress={close} type='secondary' icon={<X height={24} color={colors.text} />} />}
      />
      <View
        style={{
          width: '100%',
          height: '100%',
          justifyContent: 'space-around'
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
          >{i18n.t('reminder_modal_title')}</Text>
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
          >{i18n.t('reminder_modal_body')}</Text>
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
            >{i18n.t('reminder_modal_footer')}</Text>
        </View>
      </View>
    </View>
  );
}
