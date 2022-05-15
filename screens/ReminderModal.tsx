import { Platform, StatusBar, Text, View } from 'react-native';
import Button from '../components/Button';
import CouchDreaming from '../components/CouchDreaming';
import LinkButton from '../components/LinkButton';
import useColors from '../hooks/useColors';
import { useLogs } from '../hooks/useLogs';
import { useSegment } from '../hooks/useSegment';
import { useSettings } from '../hooks/useSettings';
import { useTranslation } from '../hooks/useTranslation';
import { RootStackScreenProps } from '../types';

export default function ReminderModal({ navigation }: RootStackScreenProps<'ReminderModal'>) {
  const colors = useColors()
  const i18n = useTranslation()
  const segment = useSegment()

  const cancel = () => {
    segment.track('reminder_modal_remind_me_later')
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
      <View
        style={{
          width: '100%',
        }}
      >
        <Text
          style={{
            fontSize: 32,
            fontWeight: 'bold',
            color: colors.text,
            textAlign: 'center',
            marginBottom: 10,
          }}
        >Want to make it a rountine?</Text>

        <View style={{
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}>
          <View
            style={{
              width: '90%',
            }}
          >
            <CouchDreaming />
          </View>
        </View>
            
        <Button>Turn on Notification</Button>
        <LinkButton style={{ marginTop: 20 }} type='secondary' onPress={() => cancel()}>Remind me later</LinkButton>
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            marginLeft: 'auto',
            marginRight: 'auto',
            textAlign: 'center',
            marginTop: 20,
            width: '90%'
          }}
        >No worries, you can change this anytime in the app settings.</Text>
      </View>
    </View>
  );
}
