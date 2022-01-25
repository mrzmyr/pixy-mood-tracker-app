import dayjs from 'dayjs';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Trash2 } from 'react-native-feather';
import ColorButton from '../components/ScaleButton';
import DismissKeyboard from '../components/DismisKeyboard';
import LinkButton from '../components/LinkButton';
import TextArea from '../components/TextArea';
import useColors from '../hooks/useColors';
import { useLogs } from '../hooks/useLogs';
import { useTranslation } from '../hooks/useTranslation';
import Scale from '../components/Scale';
import { useSettings } from '../hooks/useSettings';
import ModalHeader from '../components/ModalHeader';

export default function LogModal({ navigation, route }) {
  
  const { settings } = useSettings()
  const colors = useColors()
  const i18n = useTranslation()
  
  const defaultLogItem = {
    date: route.params.date,
    rating: 'neutral',
    message: '',
  };

  const { state, dispatch } = useLogs()

  const existingLogItem = state?.items[route.params.date];
  const [logItem, setLogItem] = useState(existingLogItem || defaultLogItem)

  const save = () => {
    dispatch({
      type: existingLogItem ? 'edit' : 'add',
      payload: logItem
    })
    navigation.navigate('CalendarScreen');
  }

  const remove = () => {
    dispatch({
      type: 'delete', 
      payload: logItem
    })
    navigation.navigate('CalendarScreen');
  }

  const cancel = () => {
    setLogItem(defaultLogItem)
    navigation.navigate('CalendarScreen');
  }

  const setRating = rating => setLogItem(logItem => ({ ...logItem, rating }))
  const setMessage = message => setLogItem(logItem => ({ ...logItem, message }))
  
  return (
    <DismissKeyboard>
    <View style={{
      flex: 1,
      justifyContent: 'flex-start',
      backgroundColor: colors.background,
      paddingTop: 20,
      paddingBottom: 20,
      paddingLeft: 20,
      paddingRight: 20,
      marginTop: Platform.OS === 'ios' ? 0 : 40,
    }}>
      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar animated={true} style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      <ModalHeader
        title={dayjs(route.params.date).format('ddd, DD.MM.YYYY')}
        right={<LinkButton onPress={save}>{i18n.t('save')}</LinkButton>}
        left={<LinkButton onPress={cancel} type='secondary'>{i18n.t('cancel')}</LinkButton>}
      />
      <View
        style={{
          width: '100%',
        }}
      >
        <Scale
          type={settings.scaleType}
          value={logItem.rating}
          onPress={setRating}
        />
      </View>
      <TextArea 
        onChange={setMessage}
        placeholder={i18n.t('log_modal_message_placeholder')}
        value={logItem.message} 
        maxLength={280}
        autoFocus
      />
      {existingLogItem && (
        <View
          style={{
            marginTop: 20,
            flexDirection: 'row',
            justifyContent: 'center',
          }}
        >
          <LinkButton 
            onPress={remove} 
            type='secondary' 
            icon={<Trash2 width={16} color={colors.secondaryLinkButtonText} />}
          >{i18n.t('delete')}</LinkButton>
        </View>
      )}
    </View>
    </DismissKeyboard>
  );
}
