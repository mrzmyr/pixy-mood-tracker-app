import { getLogEditMarginTop } from "@/helpers/responsive";
import { t } from "@/helpers/translation";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { useLogState } from "@/hooks/useLogs";
import { useTemporaryLog } from "@/hooks/useTemporaryLog";
import { getMostUsedEmotions } from "@/lib/utils";
import { Emotion, EMOTION_CATEGORIES } from "@/types";
import { LinearGradient } from "expo-linear-gradient";
import _ from "lodash";
import { useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View, ViewStyle } from "react-native";
import { Minus, Plus } from "react-native-feather";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "../../../LinkButton";
import { SlideHeadline } from "../../components/SlideHeadline";
import { EMOTIONS } from "../../config";
import { Footer } from "../Footer";
import { EMOTION_BUTTON_HEIGHT } from "./constants";
import { EmotionButtonBasic } from "./EmotionButtonBasic";
import { EmotionPage } from "./EmotionPage";
import { Tooltip } from "./Tooltip";

const WINDOW_WIDTH = Dimensions.get('window').width

type Mode = 'basic' | 'advanced'

const ExpandButton = ({
  onPress,
  expanded,
}: {
  onPress: () => void,
  expanded: boolean,
}) => {
  const colors = useColors()
  const haptics = useHaptics()

  return (
    <Pressable
      onPress={() => {
        haptics.selection()
        onPress()
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
        {expanded ? (
          <Plus width={24} height={24} color={colors.textSecondary} />
        ) : (
          <Minus width={24} height={24} color={colors.textSecondary} />
        )}
        <Text
          style={{
            marginLeft: 4,
            color: colors.textSecondary,
            fontSize: 17,
            fontWeight: '500',
          }}
        >
          {expanded ? t('more') : t('less')}
        </Text>
      </View>
    </Pressable>
  )
}

const EmotionBasicSelection = ({
  emotions,
  selectedEmotions,
  onPress,
  style = {},
}: {
  emotions: Emotion[],
  selectedEmotions: Emotion[],
  onPress: (emotion: Emotion) => void,
  style?: ViewStyle
}) => {
  const colors = useColors()
  const haptics = useHaptics()

  return (
    <View
      style={{
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginBottom: 120,
        ...style,
      }}
    >
      {['good', 'neutral', 'bad']
        .map((category) => {
          const filteredEmotions = emotions
            .filter((e) => (
              e.category === category
            ))

          const rows = _.chunk(filteredEmotions, 2)

          return rows.map((row, index) => (
            <View
              key={`basic-emotion-row-${category}-${index}`}
              style={{
                flexDirection: 'row',
                marginBottom: 8,
              }}
            >
              {row.map((emotion, index) => (
                <View
                  key={`basic-emotion-container-${emotion.key}`}
                  style={{
                    marginRight: 8,
                    flex: 1,
                  }}
                >
                  <EmotionButtonBasic
                    emotion={emotion}
                    onPress={onPress}
                    selected={selectedEmotions.map(d => d.key).includes(emotion.key)}
                  />
                </View>
              ))}
              {row.length === 1 && (
                <View
                  style={{
                    flex: 1,
                  }}
                />
              )}
            </View>
          ))
        })
        .flat()
      }
    </View>
  )
}

const EmotionAdvancedSelection = ({
  defaultIndex,
  selectedEmotions,
  onPress,
  style = {},
}: {
  defaultIndex: number,
  selectedEmotions: Emotion[],
  onPress: (emotion: Emotion) => void,
  style?: ViewStyle
}) => {
  const _carousel = useRef<ICarouselInstance>(null);

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
        onPress={onPress}
        selectedEmotions={selectedEmotions}
      />
    )
  })

  return (
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
        ...style,
      }}
    />
  )
}

const EmotionAdvancedGradients = () => {
  const colors = useColors()

  return (
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
  )
}

const EmotionBasicGradients = () => {
  const colors = useColors()

  return (
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
  )
}

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

  const toggleMode = () => {
    if (mode === 'basic') {
      setMode('advanced')
    } else {
      setMode('basic')
    }

    setShowTooltip(false)
    initialSelectedEmotions.current = selectedEmotions
  }

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
          <ExpandButton
            expanded={mode === 'basic'}
            onPress={toggleMode}
          />
        </View>
        <View
          style={{
            position: 'relative',
            flex: 1,
          }}
        >
          <ScrollView>
            <EmotionBasicSelection
              emotions={basicEmotions}
              onPress={(emotion) => {
                if (selectedEmotions.map(d => d.key).includes(emotion.key)) {
                  _setSelectedEmotions(selectedEmotions.filter((e) => e.key !== emotion.key))
                } else {
                  _setSelectedEmotions([...selectedEmotions, emotion])
                }
              }}
              selectedEmotions={selectedEmotions}
              style={{
                display: mode === 'basic' ? 'flex' : 'none',
              }}
            />
            <EmotionAdvancedSelection
              defaultIndex={defaultIndex}
              onPress={(emotion) => {
                if (selectedEmotions.map(d => d.key).includes(emotion.key)) {
                  _setSelectedEmotions(selectedEmotions.filter((e) => e.key !== emotion.key))
                } else {
                  _setSelectedEmotions([...selectedEmotions, emotion])
                }
              }}
              selectedEmotions={selectedEmotions}
              style={{
                display: mode === 'advanced' ? 'flex' : 'none',
              }}
            />
          </ScrollView>
          {mode === 'basic' && <EmotionBasicGradients />}
          {mode === 'advanced' && <EmotionAdvancedGradients />}
          {showTooltip && (
            <Tooltip
              emotion={selectedEmotions[selectedEmotions.length - 1]}
              onClose={() => setShowTooltip(false)}
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
              style={{
                fontWeight: '400',
              }}
            >{t('log_emotions_disable')}</LinkButton>
          )}
        </Footer>
      </View>
    </View>
  )
}
