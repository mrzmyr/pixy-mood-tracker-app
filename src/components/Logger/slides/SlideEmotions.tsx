import { getLogEditMarginTop } from "@/helpers/responsive";
import { t } from "@/helpers/translation";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { useLogState } from "@/hooks/useLogs";
import useScale from "@/hooks/useScale";
import { useTemporaryLog } from "@/hooks/useTemporaryLog";
import { getMostUsedEmotions } from "@/lib/utils";
import { Emotion, EMOTION_CATEGORIES } from "@/types";
import { Motion } from "@legendapp/motion";
import { LinearGradient } from "expo-linear-gradient";
import _ from "lodash";
import { useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, useColorScheme, View, ViewStyle } from "react-native";
import { Minus, Plus } from "react-native-feather";
import { RectButton } from "react-native-gesture-handler";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "../../LinkButton";
import { SlideHeadline } from "../components/SlideHeadline";
import { EMOTIONS } from "../config";
import { Footer } from "./Footer";

const EMOTION_BUTTON_HEIGHT = 60

const EmotionButtonBasic = ({
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

  const scale = useScale()
  const colorMapping = {
    very_good: scale.colors.good,
    good: scale.colors.good,
    neutral: scale.colors.neutral,
    bad: scale.colors.bad,
    very_bad: scale.colors.bad,
  }

  const color = colorMapping[emotion.category]
  const colorScheme = useColorScheme()

  return (
    <Pressable
      onPress={() => {
        haptics.selection()
        onPress(emotion)
      }}
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        ...style,
      }}
    >
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: color.background,
          // backgroundColor: colors.cardBackground,
          borderRadius: 12,
          borderWidth: selected ? 3 : 1,
          borderColor: selected ? colors.tint : colorScheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
        }}
      >
        <Text
          style={{
            color: color.text,
            textAlign: 'center',
            fontSize: 17,
            margin: selected ? -2 : 0,
          }}
        >
          {emotion.label}
        </Text>
      </View>
    </Pressable>
  )
}

const EmotionButtonAdvanced = ({
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

  const scale = useScale()
  const colorMapping = {
    very_good: scale.colors.good,
    good: scale.colors.good,
    neutral: scale.colors.neutral,
    bad: scale.colors.bad,
    very_bad: scale.colors.bad,
  }

  const color = colorMapping[emotion.category]
  const colorScheme = useColorScheme()

  return (
    <RectButton
      onPress={() => {
        haptics.selection()
        onPress(emotion)
      }}
      style={{
        flex: 1,
        minHeight: EMOTION_BUTTON_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        ...style,
      }}
      activeOpacity={0}
    >

      <View
        style={{
          flex: 1,
          width: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          // backgroundColor: colors.cardBackground,
          backgroundColor: color.background,
          borderRadius: 12,
          borderWidth: selected ? 3 : 1,
          borderColor: selected ? colors.tint : colorScheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
        }}
      >
        <Text
          style={{
            color: color.text,
            textAlign: 'center',
            fontSize: 17,
          }}
        >
          {emotion.label}
        </Text>
      </View>
    </RectButton>
  )
}

const EmotionButtonEmpty = () => {
  return (
    <View
      style={{
        minHeight: EMOTION_BUTTON_HEIGHT,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    />
  )
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

  return (
    <View
      style={{
        flexDirection: 'column',
        width: '100%',
        paddingHorizontal: 4,
        paddingTop: 12,
      }}
    >
      {chunks.map((chunk, index) => (
        <View
          key={`emotion-page-${index}`}
          style={{
            flexDirection: 'row',
            marginBottom: 2,
          }}
        >
          {chunk.map((emotion, index) => (
            emotion.key === 'empty' ? (
              <EmotionButtonEmpty key={`advanced-${emotion.key}-${index}`} />
            ) : (
              <EmotionButtonAdvanced
                key={`advanced-${emotion.key}-${index}`}
                emotion={emotion}
                onPress={onPress}
                selected={selectedEmotions.map(d => d.key).includes(emotion.key)}
                style={{
                  marginRight: chunk.indexOf(emotion) === 0 ? 6 : 0,
                  // when only one emotion is in the chunk, make it full width
                }}
              />
            )))}
        </View>
      ))}
    </View>
  )
}

const Tooltip = ({
  emotion,
}: {
  emotion: Emotion,
}) => {
  const colors = useColors()

  return (
    <Motion.View
      pointerEvents="none"
      style={{
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: 12,
        paddingHorizontal: 16,
        position: 'absolute',
        bottom: 0,
        backgroundColor: colors.tooltipBackground,
        zIndex: 1,
        right: 16,
        left: 16,
        borderRadius: 12,
      }}
      initial={{
        opacity: 0,
        translateY: 100,
      }}
      animate={{
        opacity: 1,
        translateY: 0,
      }}
    >
      {emotion && (
        <>
          <Text
            style={{
              color: colors.tooltipText,
              fontWeight: 'bold',
              fontSize: 17,
              marginBottom: 2,
            }}
          >
            {emotion.label}
          </Text>
          <Text
            style={{
              color: colors.tooltipTextSecondary,
              fontSize: 17,
              lineHeight: 24,
            }}
          >
            {emotion.description}
          </Text>
        </>
      )}
    </Motion.View>
  )
}

const WINDOW_WIDTH = Dimensions.get('window').width

type Mode = 'basic' | 'advanced'

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
  const logState = useLogState()
  const haptics = useHaptics()

  const _carousel = useRef<ICarouselInstance>(null);

  const EMOTIONS_BY_KEY = _.keyBy(EMOTIONS, 'key')

  const initialSelectedEmotions = useRef(tempLog.data?.emotions?.map(d => EMOTIONS_BY_KEY[d]) || [])
  const [selectedEmotions, setSelectedEmotions] = useState<Emotion[]>(EMOTIONS.filter(d => tempLog.data?.emotions?.includes(d.key)))
  const [showTooltip, setShowTooltip] = useState(false)

  const _setSelectedEmotions = (emotions: Emotion[]) => {
    if (selectedEmotions.length < emotions.length) {
      setShowTooltip(true)
    } else {
      setShowTooltip(false)
    }
    setSelectedEmotions(emotions)
    onChange(emotions)
  }

  const [mode, setMode] = useState<Mode>('basic')

  const pages = EMOTION_CATEGORIES.map((emotion) => {
    const filteredEmotions = EMOTIONS
      .filter((e) => (
        e.category === emotion &&
        e.disabled !== true
      ))
      .sort((a, b) => a.label.localeCompare(b.label))
    return (
      <EmotionPage
        key={`emotions-page-inner-${emotion}`}
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

  const mostUsedEmotionKeys = getMostUsedEmotions(logState.items).map(d => d.key).slice(0, 20)
  const mostUsedEmotions = EMOTIONS.filter(d => mostUsedEmotionKeys.includes(d.key))
  const predefinedBasicEmotions = EMOTIONS
    .filter((e) => (
      e.mode === 'basic' &&
      e.disabled !== true
    ))

  let basicEmotions = initialSelectedEmotions.current

  if (basicEmotions.length < 20) {
    const missingEmotions = mostUsedEmotions
      .filter(d => !basicEmotions.map(d => d.key).includes(d.key))
      .slice(0, 20 - basicEmotions.length)

    basicEmotions = [
      ...basicEmotions,
      ...missingEmotions,
    ]
  }

  if (basicEmotions.length < 20) {
    const missingEmotions = predefinedBasicEmotions
      .filter(d => !basicEmotions.map(d => d.key).includes(d.key))
      .slice(0, 20 - basicEmotions.length)

    basicEmotions = [
      ...basicEmotions,
      ...missingEmotions,
    ]
  }

  basicEmotions = basicEmotions.map((emotion) => ({
    ...emotion,
    category: {
      very_bad: 'bad',
      bad: 'bad',
      neutral: 'neutral',
      good: 'good',
      very_good: 'good',
    }[emotion.category] as Emotion['category'],
  }))

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
          position: 'relative',
        }}
      >
        <View
          style={{
            width: '100%',
            paddingHorizontal: 20,
            marginTop,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <SlideHeadline>{t('log_emotions_question')}</SlideHeadline>
          <Pressable
            onPress={() => {
              haptics.selection()
              if (mode === 'basic') {
                setMode('advanced')
              } else {
                setMode('basic')
              }
            }}
            style={{
            }}
          >
            <View
              style={{
                marginRight: 8,
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
              }}
            >
              {mode === 'basic' ? (
                <Plus width={24} height={24} color={colors.textSecondary} />
              ) : (
                <Minus width={24} height={24} color={colors.textSecondary} />
              )}
              <Text
                style={{
                  marginLeft: 4,
                  color: colors.textSecondary,
                  fontSize: 17,
                }}
              >
                {mode === 'basic' ? t('more') : t('less')}
              </Text>
            </View>
          </Pressable>
          {/* <Text
            style={{
              color: colors.textSecondary,
              fontSize: 17,
              lineHeight: 24,
              marginTop: 4,
              height: 24,
            }}
            numberOfLines={1}
          >
            {selectedEmotions.map(d => d.label).join(', ')}
          </Text> */}
        </View>
        <View
          style={{
            position: 'relative',
            flex: 1,
          }}
        >
          <ScrollView
            style={{
              flex: 1,
            }}
          >
            {mode === 'basic' && (
              <View
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  marginBottom: 120,
                }}
              >
                {['good', 'neutral', 'bad']
                  .map((category) => {
                    const filteredEmotions = basicEmotions
                      .filter((e) => (
                        e.category === category
                      ))

                    return (
                      <>
                        {filteredEmotions.map((emotion) => (
                          <View
                            key={`basic-emotion-container-${emotion.key}`}
                            style={{
                              marginRight: 6,
                              marginBottom: 6,
                            }}
                          >
                            <EmotionButtonBasic
                              emotion={emotion}
                              onPress={() => {
                                if (selectedEmotions.map(d => d.key).includes(emotion.key)) {
                                  _setSelectedEmotions(selectedEmotions.filter((e) => e.key !== emotion.key))
                                } else {
                                  _setSelectedEmotions([...selectedEmotions, emotion])
                                }
                              }}
                              selected={selectedEmotions.map(d => d.key).includes(emotion.key)}
                            />
                          </View>
                        ))}
                      </>
                    )
                  })}
              </View>
            )}
            {mode === 'advanced' && (
              <Carousel
                height={EMOTION_BUTTON_HEIGHT * 9 + 16 * 8}
                loop={false}
                ref={_carousel}
                data={pages}
                defaultIndex={defaultIndex}
                renderItem={({ index }) => pages[index]}
                panGestureHandlerProps={{
                  activeOffsetX: [-10, 10],
                }}
                width={WINDOW_WIDTH / 1.3}
                style={{
                  width: WINDOW_WIDTH,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              />
            )}
          </ScrollView>
          {mode === 'advanced' && (
            <>
              <LinearGradient
                pointerEvents="none"
                colors={[colors.logBackground, colors.logBackgroundTransparent]}
                style={{
                  position: 'absolute',
                  height: 12,
                  top: 0,
                  zIndex: 1,
                  width: '100%',
                }}
              />
              <LinearGradient
                colors={[colors.logBackgroundTransparent, colors.logBackground]}
                style={{
                  position: 'absolute',
                  height: 32,
                  bottom: 0,
                  zIndex: 1,
                  width: '100%',
                }}
                pointerEvents="none"
              />
            </>
          )}
          {showTooltip && (
            <Tooltip
              emotion={selectedEmotions[selectedEmotions.length - 1]}
            />
          )}
        </View>
        <Footer
          style={{
            marginHorizontal: 16,
          }}
        >
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