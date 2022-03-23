import * as Application from 'expo-application';
import * as Localization from 'expo-localization';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, Text, View } from 'react-native';
import { MoreHorizontal } from 'react-native-feather';
import DismissKeyboard from '../components/DismisKeyboard';
import LinkButton from '../components/LinkButton';
import ModalHeader from '../components/ModalHeader';
import TextArea from '../components/TextArea';
import useColors from './useColors';
import { useTranslation } from './useTranslation';
import * as Haptics from 'expo-haptics';
import { useSegment } from './useSegment';
import { debounce } from "lodash";

type FeedackType = 'issue' | 'idea' | 'other'

function TypeSelector({
  selected,
  onPress,
}: {
  selected: FeedackType,
  onPress: (type: FeedackType) => void,
}) {
  const i18n = useTranslation()
  const colors = useColors()

  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignItems: 'center',
      marginBottom: 10,
      width: '100%',
    }}>
      <Pressable 
        style={({ pressed }) => ({
          height: 100,
          opacity: pressed ? 0.8 : 1,
          borderRadius: 5,
          backgroundColor: colors.secondaryButtonBackground,
          flex: 1,
          alignItems: 'center',
          padding: 15,
          marginRight: 10,
          borderWidth: 1,
          borderColor: selected === 'issue' ? colors.tint : colors.secondaryButtonBackground,
        })}
        onPress={async () => {
          await Haptics.selectionAsync()
          onPress('issue')
        }}
        testID='feedback-modal-issue'
      >
        <Text style={{ fontSize: 32 }}>⚠️</Text>
        <Text 
          numberOfLines={1}
          style={{ fontSize: 17, color: colors.secondaryButtonTextColor, marginTop: 5, textAlign: 'center' }}
        >
          {i18n.t('issue')}
        </Text>
      </Pressable>
      <Pressable 
        style={({ pressed }) => ({
          height: 100,
          opacity: pressed ? 0.8 : 1,
          borderRadius: 5,
          backgroundColor: colors.secondaryButtonBackground,
          flex: 1,
          alignItems: 'center',
          padding: 15,
          marginRight: 10,
          borderWidth: 1,
          borderColor: selected === 'idea' ? colors.tint : colors.secondaryButtonBackground,
        })}
        onPress={async () => {
          await Haptics.selectionAsync()
          onPress('idea')
        }}
        testID='feedback-modal-idea'
      >
        <Text style={{ fontSize: 32 }}>💡</Text>
        <Text 
          numberOfLines={1}
          style={{ fontSize: 17, color: colors.secondaryButtonTextColor, marginTop: 5, textAlign: 'center' }}
        >
          {i18n.t('idea')}
        </Text>
      </Pressable>
      <Pressable 
        style={({ pressed }) => ({
          height: 100,
          opacity: pressed ? 0.8 : 1,
          borderRadius: 5,
          backgroundColor: colors.secondaryButtonBackground,
          flex: 1,
          alignItems: 'center',
          padding: 15,
          borderWidth: 1,
          borderColor: selected === 'other' ? colors.tint : colors.secondaryButtonBackground,
        })}
        onPress={async () => {
          await Haptics.selectionAsync()
          onPress('other')
        }}
        testID='feedback-modal-other'
      >
        <MoreHorizontal width={32} height={40} strokeWidth={2} color={colors.secondaryButtonTextColor} />
        <Text 
          numberOfLines={1}
          style={{ fontSize: 17, color: colors.secondaryButtonTextColor, marginTop: 5, textAlign: 'center' }}
        >
          {i18n.t('other')}
        </Text>
      </Pressable>
    </View>
  )
}

export default function useFeedbackModal() {
  const colors = useColors()
  const [visible, setVisible] = useState(false)
  const i18n = useTranslation()
  const segment = useSegment()

  const [defaultType, setDefaultType] = useState<FeedackType>('issue')
  
  const show = ({ 
    type = 'issue',
  }: {
    type?: FeedackType,
  }) => {
    segment.track('feedback_open')
    setDefaultType(type)
    setVisible(true)
  }
  const hide = () => {
    segment.track('feedback_close')
    setVisible(false)
  }
  
  const ModalElement = ({
    data = {},
  }: {
    data?: any,
  }) => {
    const [type, setType] = useState<FeedackType>(defaultType)
    const [message, setMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const setTypeProxy = (type: FeedackType) => {
      segment.track('feedback_type_change', { type })
      setType(type)
    }

    const trackMessageChange = useCallback(debounce((message) => {
      segment.track('feedback_message_change', { message })
    }, 1000), []);
    
    const setMessageProxy = (message: string) => {
      trackMessageChange(message)
      setMessage(message)
    }
    
    const send = async () => {
      setIsLoading(true)

      const metaData = {
        locale: Localization.locale,
        version: Application.nativeBuildVersion,
        os: Platform.OS,
        date: new Date().toISOString(),
      }
      
      segment.track('feedback_send', {
        ...metaData,
        type,
        message
      })

      const url = 'https://f7e52509fce26bc860d05c9cffff8d87.m.pipedream.net'
      const body = {
        ...data,
        ...metaData,
        type,
        message
      }
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      setIsLoading(false)
      if(resp.ok) {
        setVisible(false)
        Alert.alert(
          i18n.t('feedback_success_title'),
          i18n.t('feedback_success_message'),
          [
            { text: i18n.t('ok'), onPress: () => {} }
          ],
          { cancelable: false }
        )
      } else {
        Alert.alert(
          i18n.t('feedback_error_title'),
          i18n.t('feedback_error_message'),
          [
            { text: i18n.t('ok'), onPress: () => setVisible(false) }
          ],
          { cancelable: false }
        )
      }
    }
    
    return (
      <Modal 
        animationType={Platform.OS === 'web' ? 'none' : 'slide'}
        presentationStyle='pageSheet'
        onRequestClose={() => hide()}
        visible={visible}
        style={{
          position: 'relative'
        }}
      >
        {isLoading &&
          <View style={{
            flex: 1,
            backgroundColor: colors.background,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            position: 'absolute',
            zIndex: 99,
          }}>
            <ActivityIndicator />
          </View>
        }
        <DismissKeyboard>
        <View style={{
          flex: 1,
          justifyContent: 'flex-start',
          backgroundColor: colors.background,
          paddingTop: 20,
          paddingBottom: 20,
          paddingLeft: 20,
          paddingRight: 20,
        }}>
          <ModalHeader
            title={i18n.t('feedback_modal_title')}
            left={<LinkButton testID='feedback-modal-cancel' onPress={hide} type='secondary'>{i18n.t('feedback_modal_cancel')}</LinkButton>}
            right={<LinkButton testID='feedback-modal-submit' onPress={send}>{i18n.t('feedback_modal_send')}</LinkButton>}
          />
          <Text style={{ 
            marginBottom: 30,
            color: colors.textSecondary, 
            fontSize: 15,
            textAlign: 'center',
          }}>
            {i18n.t('feedback_modal_description')}
          </Text>
          <TypeSelector
            selected={type}
            onPress={(type) => setTypeProxy(type)}
          />
          <View style={{
            flexDirection: 'row',
            width: '100%',
          }}>
            <TextArea
              testID='feedback-modal-message'
              containerStyle={{
                marginBottom: 20,
              }}
              value={message}
              onChange={(text) => setMessageProxy(text)}
              placeholder={i18n.t('feedback_modal_textarea_placeholder')}
            />
          </View>
        </View>
        </DismissKeyboard>
      </Modal>
    );
  }
  
  return {
    Modal: ModalElement,
    show,
    hide,
  };
}
