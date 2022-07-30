import { t } from 'i18n-js';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import Button from '../../components/Button';
import Tag from '../../components/Tag';
import TextArea from '../../components/TextArea';
import useColors from '../../hooks/useColors';
import { useFeedback } from '../../hooks/useFeedback';
import { useSegment } from '../../hooks/useSegment';

const EMOJI_SCALE_IMAGES = [{
  emoji: '😍',
  active: require(`../../assets/images/emojis/smiling-face-with-heart-eyes_1f60d.png`),
  disabled: require(`../../assets/images/emojis/smiling-face-with-heart-eyes_1f60d-disabled.png`)
}, {
  emoji: '☺️',
  active: require(`../../assets/images/emojis/smiling-face_263a-fe0f.png`),
  disabled: require(`../../assets/images/emojis/smiling-face_263a-fe0f-disabled.png`)
}, {
  emoji: '🙂',
  active: require(`../../assets/images/emojis/slightly-smiling-face_1f642.png`),
  disabled: require(`../../assets/images/emojis/slightly-smiling-face_1f642-disabled.png`)
}, {
  emoji: '😐',
  active: require(`../../assets/images/emojis/neutral-face_1f610.png`),
  disabled: require(`../../assets/images/emojis/neutral-face_1f610-disabled.png`)
}, {
  emoji: '😓',
  active: require(`../../assets/images/emojis/downcast-face-with-sweat_1f613.png`),
  disabled: require(`../../assets/images/emojis/downcast-face-with-sweat_1f613-disabled.png`)
}]

const Emoji = ({
  onPress,
  selected = false,
  image,
}) => {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginBottom: 8,
      }}
    >
      <Image style={{ 
        width: selected ? 52 : 42, 
        height: selected ? 52 : 42,
      }} source={image} />
    </Pressable>
  )
}

export const FeedbackSection = ({
  scrollToEnd,
}) => {
  const segment = useSegment();
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState('');
  const feedback = useFeedback()

  const send = () => {
    setLoading(true);

    segment.track('tags_feedback_send', {
      text,
      emoji: selected,
    });
    
    feedback
      .send({
        type: 'emoji',
        source: 'tags',
        message: `Emoji selected: ${selected}, Message: "${text}"`,
      })
      .then(() => {
        setText('');
        setSelected(null);
      })
      .finally(() => {
        setLoading(false)
      });
  }
  
  useEffect(() => {
    if(selected !== null) {
      scrollToEnd()
    }
  }, [selected]);
  
  return (
    <View style={{
    }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Text style={{
          fontSize: 17,
          marginRight: 8,
          fontWeight: 'bold',
          color: colors.text,
        }}>😍🎉 {t('tags_feedback_title')}</Text>
        <Tag type="success">{t('new')}</Tag>
      </View>
      <Text style={{
        fontSize: 15,
        marginBottom: 16,
        lineHeight: 22,
        color: colors.textSecondary
      }}>{t('tags_feedback_body')}</Text>
      <Text style={{
        fontSize: 15,
        marginTop: 16,
        marginBottom: 16,
        lineHeight: 22,
        color: colors.textSecondary
      }}>{t('tags_feedback_question')}</Text>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
          paddingLeft: 32,
          paddingRight: 32,
        }}
      >
        {EMOJI_SCALE_IMAGES.map(({ emoji, active, disabled }, index) => (
          <Emoji
            key={index}
            onPress={() => {
              segment.track('tags_feedback_emoji_selected', {
                emoji,
              });
              setSelected(emoji)
            }}
            selected={selected === emoji}
            image={selected === emoji ? active : disabled}
          />
        ))}
      </View>
      { selected && (
        <View>
          <TextArea 
            placeholder={t('tags_feedback_placeholder')}
            value={text}
            onChange={setText}
            style={{
              marginBottom: 16,
              height: 100,
            }}
          />
          { loading ? (
            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 8,
            }}>
              <ActivityIndicator size="small" color={colors.text} />
            </View>
          ) : (
            <Button
              onPress={send}
              type='primary'
            >{t('tags_feedback_button')}</Button>
          )}
        </View>
      )}
    </View>
  );
};
