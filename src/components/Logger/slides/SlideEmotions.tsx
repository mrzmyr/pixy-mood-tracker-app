import { LinearGradient } from "expo-linear-gradient";
import _ from "lodash";
import { useRef, useState } from "react";
import { Dimensions, ScrollView, Text, View, ViewStyle } from "react-native";
import { RectButton } from "react-native-gesture-handler";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getLogEditMarginTop } from "@/helpers/responsive";
import { t } from "@/helpers/translation";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { useTemporaryLog } from "@/hooks/useTemporaryLog";
import LinkButton from "../../LinkButton";
import { EMOTIONS } from "../config";
import { Footer } from "./Footer";
import { SlideHeadline } from "../components/SlideHeadline";
import { Emotion } from "@/types";

const EmotionButton = ({
  emotion,
  onPress,
  selected,
  style = {},
}: {
  emotion: Emotion,
  onPress: (emotion: Emotion) => void,
  selected: boolean,
  style?: ViewStyle,
}) => {
  const colors = useColors()
  const haptics = useHaptics()

  return (
    <RectButton
      onPress={() => {
        haptics.selection()
        onPress(emotion)
      }}
      style={{
        minHeight: 70,
        flex: 1,
        backgroundColor: selected ? colors.emotionButtonBackgroundActive : colors.emotionButtonBackground,
        borderRadius: 8,
        padding: 8,
        margin: 4,
        borderWidth: 1,
        borderColor: selected ? colors.emotionButtonBorderActive : colors.emotionButtonBorder,
        // opacity: pressed ? 0.8 : 1,
        justifyContent: 'center',
        alignItems: 'center',
        ...style,
      }}
    >
      <Text
        style={{
          color: selected ? colors.emotionButtonTextActive : colors.emotionButtonText,
          textAlign: 'center',
          fontSize: 17,
        }}
      >
        {emotion.label}
      </Text>
    </RectButton>
  )
}

const EmotionButtonEmpty = () => {
  return (
    <View
      style={{
        minHeight: 70,
        flex: 1,
        padding: 8,
        margin: 4,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    />
  )
}

const EMOTION_PAGE_TYPE_MAP = {
  'very_negative': 'unpleasant',
  'negative': 'unpleasant',
  'neutral': 'neutral',
  'positive': 'pleasant',
  'very_positive': 'pleasant',
}

const EmotionPage = ({
  emotions,
  onPress,
  selectedEmotions,
}: {
  emotions: Emotion[],
  onPress: (emotion: Emotion) => void,
  selectedEmotions: Emotion[],
}) => {
  const colors = useColors()
  const chunks = _.chunk(emotions, 2).map(d => d.length === 1 ? [...d, { key: 'empty', label: '' } as Emotion] : d)
  const type = emotions[0].category

  return (
    <View
      style={{
        flexDirection: 'column',
        width: '100%',
        paddingHorizontal: 4,
      }}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 17,
          marginBottom: 8,
          paddingHorizontal: 4,
        }}
      >{t(EMOTION_PAGE_TYPE_MAP[type])}</Text>
      {chunks.map((chunk, index) => (
        <View
          key={index}
          style={{
            flexDirection: 'row',
            marginBottom: 4,
          }}
        >
          {chunk.map((emotion, index) => (
            emotion.key === 'empty' ? (
              <EmotionButtonEmpty key={`${emotion.key}-${index}`} />
            ) : (
              <EmotionButton
                key={emotion.key}
                emotion={emotion}
                onPress={onPress}
                selected={selectedEmotions.map(d => d.key).includes(emotion.key)}
                style={{
                  marginRight: chunk.indexOf(emotion) === 0 ? 8 : 0,
                  // when only one emotion is in the chunk, make it full width
                }}
              />
            )))}
        </View>
      ))}
    </View>
  )
}

const WINDOW_WIDTH = Dimensions.get('window').width

export const SlideEmotions = ({
  defaultIndex,
  onDisableStep,
  onChange,
  showDisable,
}: {
  defaultIndex: number,
  onDisableStep: () => void,
  onChange: (emotions: Emotion[]) => void,
  showDisable: boolean,
}) => {
  const colors = useColors();
  const marginTop = getLogEditMarginTop()
  const insets = useSafeAreaInsets()
  const tempLog = useTemporaryLog()

  const _carousel = useRef<ICarouselInstance>(null);

  const emotions = _.keys(_.keyBy(EMOTIONS, 'category'))
  const [selectedEmotions, setSelectedEmotions] = useState<Emotion[]>(EMOTIONS.filter(d => tempLog.data.emotions.includes(d.key)))

  const _setSelectedEmotions = (emotions: Emotion[]) => {
    setSelectedEmotions(emotions)
    onChange(emotions)
  }

  const pages = emotions.map((emotion) => {
    const filteredEmotions = EMOTIONS.filter((e) => e.category === emotion)
    return (
      <EmotionPage
        key={emotion}
        emotions={filteredEmotions}
        onPress={(emotion) => {
          if (selectedEmotions.map(d => d.key).includes(emotion.key)) {
            _setSelectedEmotions(selectedEmotions.filter((e) => e.key !== emotion.key))
          } else {
            _setSelectedEmotions([...selectedEmotions, emotion])
          }
        }}
        selectedEmotions={selectedEmotions}
      />
    )
  })

  const baseOptions = ({
    width: WINDOW_WIDTH / 1.3,
    style: {
      width: WINDOW_WIDTH,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 6,
    }
  } as const);

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.logBackground,
      width: '100%',
      paddingBottom: insets.bottom + 20,
    }}>
      <View
        style={{
          flex: 1,
          marginTop,
          position: 'relative',
        }}
      >
        <View
          style={{
            width: '100%',
            paddingHorizontal: 20,
            paddingBottom: 4,
          }}
        >
          <SlideHeadline>{t('log_emotions_question')}</SlideHeadline>
        </View>
        <ScrollView
          style={{
            flex: 1,
          }}
        >
          <Carousel
            {...baseOptions}
            height={80 * 8 + 16 * 8}
            loop={false}
            ref={_carousel}
            data={pages}
            defaultIndex={defaultIndex}
            renderItem={({ index }) => pages[index]}
            panGestureHandlerProps={{
              activeOffsetX: [-10, 10],
            }}
          />
        </ScrollView>
        <LinearGradient
          pointerEvents="none"
          colors={[colors.logBackground, colors.logBackgroundTransparent]}
          style={{
            position: 'absolute',
            height: 24,
            top: 24,
            zIndex: 1,
            width: '100%',
          }}
        />
        <LinearGradient
          colors={[colors.logBackgroundTransparent, colors.logBackground]}
          style={{
            position: 'absolute',
            height: 32,
            bottom: insets.bottom + 16,
            zIndex: 1,
            width: '100%',
          }}
          pointerEvents="none"
        />
        <Footer>
          {showDisable && (
            <LinkButton
              type="secondary"
              onPress={onDisableStep}
            >{t('log_emotions_disable')}</LinkButton>
          )}
        </Footer>
      </View>
    </View>
  )
}