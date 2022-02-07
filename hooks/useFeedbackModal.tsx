import * as Localization from 'expo-localization';
import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, Text, View } from 'react-native';
import { AlertTriangle, MessageCircle, MoreHorizontal, Sun } from 'react-native-feather';
import Button from '../components/Button';
import DismissKeyboard from '../components/DismisKeyboard';
import TextArea from '../components/TextArea';
import useColors from './useColors';
import { useTranslation } from './useTranslation';

function TypeSelector({
  selected,
  onPress,
}: {
  selected: 'issue' | 'idea' | 'other',
  onPress: (type: 'issue' | 'idea' | 'other') => void,
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
      <Pressable style={({ pressed }) => ({
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
        onPress={() => onPress('issue')}
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
      <Pressable style={({ pressed }) => ({
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
        onPress={() => onPress('idea')}
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
      <Pressable style={({ pressed }) => ({
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
        onPress={() => onPress('other')}
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

  const [defaultType, setDefaultType] = useState<'issue' | 'idea' | 'other'>('issue')
  
  const show = ({ 
    type = 'issue',
  }: {
    type?: 'issue' | 'idea' | 'other',
  }) => {
    setDefaultType(type)
    setVisible(true)
  }
  const hide = () => setVisible(false)
  
  const ModalElement = ({
    data = {},
  }: {
    data?: any,
  }) => {
    const [type, setType] = useState<'issue' | 'idea' | 'other'>(defaultType)
    const [message, setMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const send = async () => {
      setIsLoading(true)
      const url = 'https://f7e52509fce26bc860d05c9cffff8d87.m.pipedream.net'
      const body = {
        ...data,
        locale: Localization.locale,
        date: new Date().toISOString(),
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
        Alert.alert(
          i18n.t('feedback_success_title'),
          i18n.t('feedback_success_message'),
          [
            { text: i18n.t('ok'), onPress: () => setVisible(false) }
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
      >
        <DismissKeyboard>
        <View style={{
          flex: 1,
          padding: 20,
          paddingTop: 40,
          backgroundColor: colors.background,
          alignItems: 'center',
        }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
          <Text style={{
            fontWeight: 'bold',
            color: colors.text, 
            fontSize: 28,
          }}>
            {i18n.t('feedback_modal_title')}
          </Text>
          </View>
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
            onPress={(type) => setType(type)}
          />
          <View style={{
            flexDirection: 'row',
            width: '100%',
          }}>
            <TextArea
              numberOfLines={3}
              testID='feedback-modal-message'
              containerStyle={{
                marginBottom: 20,
              }}
              value={message}
              onChange={(text) => setMessage(text)}
              placeholder={i18n.t('feedback_modal_textarea_placeholder')}
            />
          </View>
          <View style={{
            flexDirection: 'row',
            width: '100%',
          }}>
            <Button
              testID='feedback-modal-cancel'
              type='secondary'
              onPress={() => hide()}
              style={{
                flex: 1,
                marginRight: 15,
              }}
            >{i18n.t('feedback_modal_cancel')}</Button>
            <Button
              testID='feedback-modal-send'
              onPress={() => send()}
              style={{
                flex: 1
              }}
              isLoading={isLoading}
            >{i18n.t('feedback_modal_send')}</Button>
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
