import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { MoreHorizontal } from 'react-native-feather';
import DismissKeyboard from '../components/DismisKeyboard';
import LinkButton from '../components/LinkButton';
import ModalHeader from '../components/ModalHeader';
import TextArea from '../components/TextArea';
import useColors from './useColors';
import { FeedackType, useFeedback } from './useFeedback';
import useHaptics from './useHaptics';
import { useSegment } from './useSegment';
import { useTranslation } from './useTranslation';

function TypeSelector({
  selected,
  onPress,
}: {
  selected: FeedackType,
  onPress: (type: FeedackType) => void,
}) {
  const i18n = useTranslation()
  const colors = useColors()
  const haptics = useHaptics()

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
          opacity: pressed ? 0.8 : 1,
          borderRadius: 8,
          backgroundColor: colors.feedbackSelectionBackground,
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 15,
          marginRight: 10,
          borderWidth: 2,
          borderColor: selected === 'issue' ? colors.tint : colors.feedbackSelectionBackground,
          maxHeight: 100,
        })}
        onPress={async () => {
          await haptics.selection()
          onPress('issue')
        }}
        testID='feedback-modal-issue'
      >
        <Text 
          numberOfLines={1}
          style={{ fontSize: 32, color: colors.secondaryButtonText, textAlign: 'center' }}
        >
          ⚠️
        </Text>
        <Text 
          numberOfLines={1}
          style={{ 
            fontSize: 17, 
            color: colors.secondaryButtonText, 
            marginTop: 5, 
            textAlign: 'center' 
          }}
        >
          {i18n.t('issue')}
        </Text>
      </Pressable>
      <Pressable 
        style={({ pressed }) => ({
          opacity: pressed ? 0.8 : 1,
          borderRadius: 8,
          backgroundColor: colors.feedbackSelectionBackground,
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 15,
          marginRight: 10,
          borderWidth: 2,
          borderColor: selected === 'idea' ? colors.tint : colors.feedbackSelectionBackground,
          maxHeight: 100,
        })}
        onPress={async () => {
          await haptics.selection()
          onPress('idea')
        }}
        testID='feedback-modal-idea'
      >
        <Text 
          numberOfLines={1}
          style={{ fontSize: 32, color: colors.secondaryButtonText, textAlign: 'center' }}
        >
          💡
        </Text>
        <Text 
          numberOfLines={1}
          style={{ 
            fontSize: 17, 
            color: colors.secondaryButtonText, 
            marginTop: 5, 
            textAlign: 'center' 
          }}
        >
          {i18n.t('idea')}
        </Text>
      </Pressable>
      <Pressable 
        style={({ pressed }) => ({
          opacity: pressed ? 0.8 : 1,
          borderRadius: 8,
          backgroundColor: colors.feedbackSelectionBackground,
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 15,
          borderWidth: 2,
          borderColor: selected === 'other' ? colors.tint : colors.feedbackSelectionBackground,
          maxHeight: 100,
        })}
        onPress={async () => {
          await haptics.selection()
          onPress('other')
        }}
        testID='feedback-modal-other'
      >
        <MoreHorizontal height={40} color={colors.secondaryButtonText} />
        <Text 
          numberOfLines={1}
          style={{ fontSize: 17, color: colors.secondaryButtonText, marginTop: 5, textAlign: 'center' }}
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
  const feedback = useFeedback()
  const { t } = useTranslation()

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
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const setTypeProxy = (type: FeedackType) => {
      segment.track('feedback_type_change', { type })
      setType(type)
    }
    
    const setMessageProxy = (message: string) => {
      setMessage(message)
    }
    
    const send = async () => {
      setIsLoading(true)

      feedback.send({
        type,
        message,
        email,
        source: 'modal',
        onCancel: () => {
          setVisible(false)
        }
      }).then(resp => {
        setVisible(false)
      }).finally(() => {
        setIsLoading(false)
      })
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
            backgroundColor: colors.feedbackBackground,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            position: 'absolute',
            zIndex: 99,
          }}>
            <ActivityIndicator size={'small'} color={colors.loadingIndicator} />
          </View>
        }
        <DismissKeyboard>
        <View style={{
          flex: 1,
          justifyContent: 'flex-start',
          backgroundColor: colors.feedbackBackground,
        }}>
          <ModalHeader
            left={
              <LinkButton 
                testID='feedback-modal-cancel' 
                onPress={hide} 
                type='primary' 
              >{t('cancel')}</LinkButton>
            }
            right={
              <LinkButton 
                testID='feedback-modal-cancel' 
                onPress={send} 
                type='primary'
                disabled={!message.length}
              >{t('send')}</LinkButton>
            }
          />
          <View
            style={{
              padding: 16,
            }}
          >
            <Text style={{ 
              marginTop: 16,
              marginBottom: 8,
              color: colors.text, 
              fontSize: 32,
              textAlign: 'center',
              fontWeight: 'bold',
            }}>
              {i18n.t('feedback_modal_title')}
            </Text>
            <Text style={{ 
              marginBottom: 30,
              color: colors.textSecondary, 
              fontSize: 15,
              lineHeight: 20,
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
              marginTop: 8,
            }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: colors.textInputBackground,
                  borderRadius: 8,
                  padding: 16,
                  color: colors.text,
                  fontSize: 17,
                }}
                autoComplete='email'
                keyboardType='email-address'
                placeholderTextColor={colors.textInputPlaceholder}
                value={email}
                onChangeText={(text) => setEmail(text)}
                placeholder={i18n.t('feedback_modal_email_placeholder')}
              />
            </View>
            <View style={{
              flexDirection: 'row',
              width: '100%',
              marginTop: 8,
            }}>
              <TextArea
                testID='feedback-modal-message'
                containerStyle={{
                  marginBottom: 8,
                }}
                style={{
                  height: 180,
                }}
                value={message}
                onChange={(text) => setMessageProxy(text)}
                placeholder={i18n.t('feedback_modal_message_placeholder')}
              />
            </View>
            <Text style={[{
              fontSize: 14,
              color: colors.textSecondary,
              padding: 8,
              paddingTop: 0,
              marginTop: 4,
            }]}>{i18n.t('feedback_modal_help')}</Text>
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
