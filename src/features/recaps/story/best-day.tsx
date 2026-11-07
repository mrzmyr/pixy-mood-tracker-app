import dayjs from "dayjs";
import { use, useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { ViewStyle } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  FadeOut,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import ChevronsRight from "lucide-react-native/icons/chevrons-right";
import { CLOUDY_SIZE } from "@/components/cloudy";
import { cheer, PixyGuideContext } from "@/components/pixy-guide-context";
import { SkyFlightZone } from "@/components/sky-flight-zone";
import { RADIUS } from "@/constants/radius";
import { EmotionIndicator, EMOTIONS } from "@/features/logger";
import { t, tDynamic } from "@/lib/translation";
import { RingedAvatar } from "../components/ringed-avatar";
import {
  GlassChip,
  Reveal,
  RevealText,
  SlideHeader,
  StoryImage,
  StoryText,
  TagDot,
} from "./parts";
import {
  getStoryTheme,
  revealTextMs,
  STORY_BLOCK_GAP,
  STORY_MAX_FONT_SCALE,
  STORY_PALETTE,
  STORY_TITLE_GAP,
  STORY_TYPE,
  titleRevealEnd,
} from "./theme";
import type { StoryTheme } from "./theme";
import type { SlideContext } from "./slides";
import type { BestDaySlide } from "./types";

const TRACK_HEIGHT = 60;
const THUMB_INSET = 6;
const THUMB_SIZE = TRACK_HEIGHT - 2 * THUMB_INSET;
/** Share of the track the thumb must pass to unlock on release. */
const UNLOCK_SHARE = 0.7;
const SETTLE_MS = 220;
const EASING = Easing.out(Easing.cubic);
/** On press down Cloudy glides to the thumb this long: slow, calm. */
const PIXY_CALL_MS = 1200;
/** On release, or when the track goes away, Pixy glides back this long. */
const PIXY_GLIDE_MS = 1100;
const PIXY_GLIDE_EASING = Easing.inOut(Easing.cubic);
/** Pixy's center sits this far above the track top: just over the thumb. */
const PIXY_HOVER_GAP = CLOUDY_SIZE * 0.42;
/** Pixy cheers this long before the day opens. */
const CHEER_MS = 800;

/** One shine pass over the track label, left to right. */
const SHIMMER_MS = 2200;
/**
 * Shine bands over the label, widest first. Stacked, they make a soft
 * highlight that is brightest in the middle.
 */
const SHIMMER_BANDS = [
  { width: 96, opacity: 0.5 },
  { width: 60, opacity: 0.6 },
  { width: 28, opacity: 0.9 },
];
const SHIMMER_REACH = SHIMMER_BANDS[0].width;
/** Share of the travel after which the label is gone. */
const LABEL_FADE_SHARE = 0.45;
/** Fade of one block of the day into its locked shape. */
const UNVEIL_MS = 600;
/** The question fades out this long; the day title starts after it. */
const QUESTION_FADE_MS = 250;
/** Time the track takes to fade out after the swipe. */
const TRACK_FADE_MS = 250;
const AVATAR_SIZE = 28;

/** Time between two photos, and from one block to the next. */
const PHOTO_STEP_MS = 450;
const BLOCK_STEP_MS = 500;
/** Pause after the swipe before the day title writes itself. */
const OPEN_DELAY_MS = QUESTION_FADE_MS + 100;
const MAX_PHOTOS = 3;
const MAX_PEOPLE = 4;

const EMOTION_BY_KEY = new Map(
  EMOTIONS.map((emotion) => [emotion.key, emotion])
);
const GOOD = new Set(["very_good", "good"]);

/**
 * Window over the label that moves with `sweep`. Its text copy moves back
 * the same distance, so the copy stays on top of the label.
 */
const ShimmerBand = ({
  band,
  sweep,
  width,
  children,
}: {
  band: (typeof SHIMMER_BANDS)[number];
  sweep: SharedValue<number>;
  width: number;
  children: React.ReactNode;
}) => {
  const left = (progress: number) => {
    "worklet";
    const center = interpolate(
      progress,
      [0, 1],
      [-SHIMMER_REACH, width + SHIMMER_REACH]
    );
    return center - band.width / 2;
  };
  const windowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: left(sweep.get()) }],
  }));
  const copyStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -left(sweep.get()) }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: band.width,
          overflow: "hidden",
          opacity: band.opacity,
        },
        windowStyle,
      ]}
    >
      <Animated.View style={[{ width }, copyStyle]}>{children}</Animated.View>
    </Animated.View>
  );
};

/**
 * One line of text with a shine that sweeps across it again and again, as on
 * the classic lock screen. Without motion it stays still.
 */
const ShimmerLabel = ({ text, theme }: { text: string; theme: StoryTheme }) => {
  const palette = STORY_PALETTE[theme];
  const isReducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (isReducedMotion || width === 0) {
      return;
    }
    sweep.set(
      withRepeat(
        withTiming(1, { duration: SHIMMER_MS, easing: Easing.linear }),
        -1
      )
    );
    return () => cancelAnimation(sweep);
  }, [isReducedMotion, sweep, width]);

  const textStyle = [
    STORY_TYPE.body,
    { fontWeight: "500" as const, width, textAlign: "center" as const },
  ];
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <Text
        maxFontSizeMultiplier={STORY_MAX_FONT_SCALE}
        numberOfLines={1}
        style={[textStyle, { color: palette.muted }]}
      >
        {text}
      </Text>
      {width > 0 &&
        !isReducedMotion &&
        SHIMMER_BANDS.map((band) => (
          <ShimmerBand key={band.width} band={band} sweep={sweep} width={width}>
            <Text
              maxFontSizeMultiplier={STORY_MAX_FONT_SCALE}
              numberOfLines={1}
              style={[textStyle, { color: palette.text }]}
            >
              {text}
            </Text>
          </ShimmerBand>
        ))}
    </View>
  );
};

/**
 * Track with a thumb the user drags to the end. Releases short of
 * `UNLOCK_SHARE` slide the thumb back. Screen readers get one button.
 * Cloudy flies its free sky. On press down it comes over, hovers above
 * the thumb, follows it, and sends more sparkles the further it goes. A
 * release short of the end sends it back to its sky. On unlock Pixy cheers,
 * then the day opens.
 */
const SwipeToUnlock = ({
  theme,
  onUnlock,
}: {
  theme: StoryTheme;
  onUnlock: () => void;
}) => {
  const palette = STORY_PALETTE[theme];
  const guide = use(PixyGuideContext);
  const track = useRef<View>(null);
  const [width, setWidth] = useState(0);
  const travel = Math.max(0, width - THUMB_SIZE - 2 * THUMB_INSET);
  const offset = useSharedValue(0);
  // Thumb start center and travel, for the reaction on the UI thread.
  const thumbX = useSharedValue(0);
  const thumbTop = useSharedValue(0);
  const travelShared = useSharedValue(0);
  const isUnlocking = useRef(false);
  // UI thread copy: a release after the unlock keeps Pixy at the thumb.
  const isUnlockedShared = useSharedValue(false);
  const cheerTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useAnimatedReaction(
    () => offset.get(),
    (current) => {
      if (!guide) {
        return;
      }
      guide.x.set(thumbX.get() + current);
      guide.y.set(thumbTop.get() - PIXY_HOVER_GAP);
      const range = travelShared.get();
      guide.joy.set(range > 0 ? current / range : 0);
    }
  );

  // Pixy flies back to its free sky when the track goes away.
  useEffect(
    () => () => {
      if (cheerTimer.current) {
        clearTimeout(cheerTimer.current);
      }
      guide?.joy.set(0);
      guide?.follow.set(
        withTiming(0, { duration: PIXY_GLIDE_MS, easing: PIXY_GLIDE_EASING })
      );
    },
    [guide]
  );

  const onLayout = (layoutWidth: number) => {
    setWidth(layoutWidth);
    travelShared.set(Math.max(0, layoutWidth - THUMB_SIZE - 2 * THUMB_INSET));
    track.current?.measureInWindow((x, y) => {
      thumbX.set(x + THUMB_INSET + THUMB_SIZE / 2);
      thumbTop.set(y);
      guide?.x.set(x + THUMB_INSET + THUMB_SIZE / 2 + offset.get());
      guide?.y.set(y - PIXY_HOVER_GAP);
    });
  };

  const unlock = () => {
    if (isUnlocking.current) {
      return;
    }
    isUnlocking.current = true;
    if (guide) {
      // Screen readers unlock without a press: Pixy comes over to cheer.
      guide.follow.set(
        withTiming(1, { duration: PIXY_CALL_MS, easing: PIXY_GLIDE_EASING })
      );
      cheer(guide);
    }
    cheerTimer.current = setTimeout(onUnlock, guide ? CHEER_MS : 0);
  };

  const gesture = usePanGesture({
    enabled: travel > 0,
    maxPointers: 1,
    activeOffsetX: 8,
    failOffsetY: [-12, 12],
    onBegin: () => {
      guide?.follow.set(
        withTiming(1, { duration: PIXY_CALL_MS, easing: PIXY_GLIDE_EASING })
      );
    },
    onFinalize: () => {
      if (!isUnlockedShared.get()) {
        guide?.follow.set(
          withTiming(0, { duration: PIXY_GLIDE_MS, easing: PIXY_GLIDE_EASING })
        );
      }
    },
    onUpdate: (event) => {
      offset.set(Math.min(travel, Math.max(0, event.translationX)));
    },
    onDeactivate: (event) => {
      const isUnlocked =
        !event.canceled &&
        (offset.get() >= travel * UNLOCK_SHARE || event.velocityX > 800);
      offset.set(
        withTiming(isUnlocked ? travel : 0, {
          duration: SETTLE_MS,
          easing: EASING,
        })
      );
      if (isUnlocked) {
        isUnlockedShared.set(true);
        scheduleOnRN(unlock);
      }
    },
  });
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() }],
  }));
  // The label fades while the thumb moves over it, back in when it returns.
  const labelStyle = useAnimatedStyle(() => {
    const range = travelShared.get() * LABEL_FADE_SHARE;
    return {
      opacity:
        range > 0 ? interpolate(offset.get(), [0, range], [1, 0], "clamp") : 1,
    };
  });
  return (
    <GestureDetector gesture={gesture}>
      <View
        ref={track}
        accessible
        accessibilityRole="button"
        accessibilityLabel={t("recaps_story_best_day_show")}
        onAccessibilityTap={unlock}
        // Taps on the track never skip the slide.
        onStartShouldSetResponder={() => true}
        onLayout={(event) => onLayout(event.nativeEvent.layout.width)}
        testID="recap-story-best-day-unlock"
        style={{
          height: TRACK_HEIGHT,
          borderRadius: RADIUS.full,
          borderWidth: 1,
          borderColor: palette.glassBorder,
          backgroundColor: palette.glass,
          justifyContent: "center",
        }}
      >
        <Animated.View
          style={[
            {
              position: "absolute",
              left: THUMB_INSET + THUMB_SIZE,
              right: THUMB_INSET,
            },
            labelStyle,
          ]}
        >
          <ShimmerLabel text={t("recaps_story_best_day_slide")} theme={theme} />
        </Animated.View>
        <Animated.View
          style={[
            {
              position: "absolute",
              left: THUMB_INSET,
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: RADIUS.full,
              backgroundColor: palette.text,
              alignItems: "center",
              justifyContent: "center",
            },
            thumbStyle,
          ]}
        >
          <ChevronsRight width={22} height={22} color={palette.background} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
};

/** What the best day shows: photos, people, good emotions, and tags. */
const getDayContent = (slide: BestDaySlide, ctx: SlideContext) => {
  const day = ctx.days.find((item) => item.date === slide.date);
  if (!day) {
    return null;
  }
  const photos = day.items.flatMap((item) => item.photos).slice(0, MAX_PHOTOS);
  const people = [
    ...new Set(day.items.flatMap((item) => item.people.map(({ id }) => id))),
  ].flatMap((id) => ctx.people.get(id) ?? []);
  const shownPeople = people.slice(0, MAX_PEOPLE);
  const emotions = [
    ...new Set(day.items.flatMap((item) => item.emotions)),
  ].flatMap((key) => {
    const emotion = EMOTION_BY_KEY.get(key);
    return emotion && GOOD.has(emotion.category) ? [emotion] : [];
  });
  const tags = [
    ...new Set(day.items.flatMap((item) => item.tags.map(({ id }) => id))),
  ].flatMap((id) => ctx.tags.get(id) ?? []);
  return { day, photos, people, shownPeople, emotions, tags };
};

/**
 * Opacity that stays 0 while the day is locked and fades to 1 `at`
 * milliseconds after `isShown` turns true.
 */
const useUnveil = (isShown: boolean, at: number) => {
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (isShown) {
      opacity.set(
        withDelay(at, withTiming(1, { duration: UNVEIL_MS, easing: EASING }))
      );
    }
  }, [opacity, isShown, at]);
  return useAnimatedStyle(() => ({ opacity: opacity.get() }));
};

/** Content that fades in over its locked shape on unlock. */
const Unveil = ({
  isShown,
  at,
  style,
  children,
}: {
  isShown: boolean;
  at: number;
  style?: ViewStyle;
  children: React.ReactNode;
}) => {
  const unveil = useUnveil(isShown, at);
  return <Animated.View style={[style, unveil]}>{children}</Animated.View>;
};

/** Chip that keeps its glass shape while locked; its content fades in. */
const UnveilChip = ({
  isShown,
  at,
  ...chip
}: { isShown: boolean; at: number } & Omit<
  React.ComponentProps<typeof GlassChip>,
  "contentStyle"
>) => {
  const unveil = useUnveil(isShown, at);
  return <GlassChip {...chip} contentStyle={unveil} />;
};

/** See-through white shape in place of a photo, avatar, or line of text. */
const getLockedFill = (theme: StoryTheme): ViewStyle => ({
  backgroundColor: STORY_PALETTE[theme].glass,
  borderWidth: 1,
  borderColor: STORY_PALETTE[theme].glassBorder,
});

/**
 * Title slot: the question while locked, the day title after the swipe.
 * It keeps the height of the taller one, so nothing below it moves.
 */
const TitleSlot = ({
  question,
  title,
  isUnlocked,
  theme,
}: {
  question: string;
  title: string;
  isUnlocked: boolean;
  theme: StoryTheme;
}) => {
  const [heights, setHeights] = useState({ question: 0, title: 0 });
  const measure = (key: keyof typeof heights, text: string) => (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      onLayout={(event) => {
        const { height } = event.nativeEvent.layout;
        setHeights((current) =>
          current[key] === height ? current : { ...current, [key]: height }
        );
      }}
      style={{ position: "absolute", left: 0, right: 0, opacity: 0 }}
    >
      <StoryText kind="title" theme={theme}>
        {text}
      </StoryText>
    </View>
  );
  return (
    <View style={{ minHeight: Math.max(heights.question, heights.title) }}>
      {measure("question", question)}
      {measure("title", title)}
      {isUnlocked ? (
        <RevealText
          text={title}
          at={OPEN_DELAY_MS}
          kind="title"
          theme={theme}
        />
      ) : (
        <Animated.View exiting={FadeOut.duration(QUESTION_FADE_MS)}>
          <SlideHeader theme={theme} title={question} />
        </Animated.View>
      )}
    </View>
  );
};

/**
 * Best day of the month. One layout, locked and open. Locked: the question
 * in the title slot, and the day's shapes in see-through white: empty photo
 * tiles, avatar circles, a bar for the names, empty chips. Nothing of the
 * day shows, and no photo loads. The swipe fills the same shapes in place:
 * the day title replaces the question, then photos, people, emotions, and
 * tags fade in. Long days scroll.
 */
const DayLayout = ({
  content,
  theme,
  isUnlocked,
  track,
}: {
  content: NonNullable<ReturnType<typeof getDayContent>>;
  theme: StoryTheme;
  isUnlocked: boolean;
  track: React.ReactNode;
}) => {
  const { day, photos, people, shownPeople, emotions, tags } = content;
  const names = [
    ...shownPeople.map((person) => person.name),
    ...(people.length > MAX_PEOPLE
      ? [t("recaps_connected_more", { count: people.length - MAX_PEOPLE })]
      : []),
  ].join(", ");
  const question = t("recaps_story_best_day_ask");
  const title = t("recaps_day_best_title_month", {
    day: dayjs(day.date).format("dddd, D MMMM"),
  });
  // Locked shapes show once the question has written itself.
  const lockedAt = titleRevealEnd(question);
  const photoAt = (index: number) =>
    OPEN_DELAY_MS + revealTextMs(title) + index * PHOTO_STEP_MS;
  const peopleAt = photoAt(photos.length) + (photos.length > 0 ? 0 : 200);
  const emotionsAt =
    peopleAt + (people.length > 0 ? BLOCK_STEP_MS + revealTextMs(names) : 0);
  const tagsAt =
    emotionsAt +
    (emotions.length > 0 ? BLOCK_STEP_MS + emotions.length * 120 : 0);
  const glass = getLockedFill(theme);

  return (
    <View style={{ flex: 1 }}>
      <TitleSlot
        question={question}
        title={title}
        isUnlocked={isUnlocked}
        theme={theme}
      />
      <Reveal
        at={isUnlocked ? 0 : lockedAt}
        style={{ flexShrink: 1, marginTop: STORY_TITLE_GAP }}
      >
        <ScrollView
          // Content height, shrinking to scroll when the day is long; cloud
          // Pixy flies in the sky left below.
          style={{ flexGrow: 0, flexShrink: 1 }}
          contentContainerStyle={{ gap: STORY_BLOCK_GAP, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={isUnlocked}
          // Locked shapes hold nothing to read.
          accessibilityElementsHidden={!isUnlocked}
          importantForAccessibility={
            isUnlocked ? "auto" : "no-hide-descendants"
          }
          testID="recap-story-best-day-content"
        >
          {photos.length > 0 && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {photos.map((photo, index) => (
                <View
                  key={photo.id}
                  style={[
                    glass,
                    {
                      flex: 1,
                      aspectRatio: photos.length === 1 ? 4 / 3 : 3 / 4,
                      borderRadius: RADIUS.lg,
                      overflow: "hidden",
                    },
                  ]}
                >
                  {isUnlocked && (
                    <Unveil isShown at={photoAt(index)} style={{ flex: 1 }}>
                      <StoryImage
                        photo={photo}
                        style={{ flex: 1, borderRadius: RADIUS.lg }}
                      />
                    </Unveil>
                  )}
                </View>
              ))}
            </View>
          )}
          {people.length > 0 && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {shownPeople.map((person, index) => (
                <View
                  key={person.id}
                  style={[
                    glass,
                    {
                      width: AVATAR_SIZE,
                      height: AVATAR_SIZE,
                      borderRadius: RADIUS.full,
                    },
                  ]}
                >
                  {isUnlocked && (
                    <Unveil
                      isShown
                      at={peopleAt + index * 120}
                      style={{ position: "absolute", top: -1, left: -1 }}
                    >
                      <RingedAvatar person={person} size={AVATAR_SIZE} />
                    </Unveil>
                  )}
                </View>
              ))}
              <View style={{ flexShrink: 1, flexGrow: 1 }}>
                {isUnlocked ? (
                  <RevealText
                    text={names}
                    at={peopleAt + shownPeople.length * 120}
                    kind="body"
                    theme={theme}
                    tone="muted"
                  />
                ) : (
                  <Animated.View
                    // Stays until the names write themselves in its place.
                    exiting={FadeOut.delay(
                      peopleAt + shownPeople.length * 120
                    ).duration(QUESTION_FADE_MS)}
                    style={[
                      glass,
                      {
                        width: "55%",
                        height: STORY_TYPE.body.fontSize,
                        borderRadius: RADIUS.full,
                      },
                    ]}
                  />
                )}
              </View>
            </View>
          )}
          {emotions.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {emotions.map((emotion, index) => (
                <UnveilChip
                  key={emotion.key}
                  isShown={isUnlocked}
                  at={emotionsAt + index * 120}
                  theme={theme}
                  marker={<EmotionIndicator emotion={emotion} compact />}
                  label={tDynamic(`log_emotion_${emotion.key}`)}
                />
              ))}
            </View>
          )}
          {tags.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {tags.map((tag, index) => (
                <UnveilChip
                  key={tag.id}
                  isShown={isUnlocked}
                  at={tagsAt + index * 120}
                  theme={theme}
                  marker={<TagDot tag={tag} />}
                  label={tag.title}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </Reveal>
      <SkyFlightZone style={{ flex: 1, marginVertical: STORY_BLOCK_GAP }} />
      {!isUnlocked && (
        <Reveal at={lockedAt + BLOCK_STEP_MS}>
          <Animated.View exiting={FadeOut.duration(TRACK_FADE_MS)}>
            {track}
          </Animated.View>
        </Reveal>
      )}
    </View>
  );
};

/**
 * Best day slide. `isUnlocked` and `onUnlock` let the story wait for the
 * swipe; without them the slide keeps its own state, as in the playground.
 */
export const BestDay = ({
  slide,
  ctx,
  isUnlocked: isUnlockedFromParent,
  onUnlock,
}: {
  slide: BestDaySlide;
  ctx: SlideContext;
  isUnlocked?: boolean;
  onUnlock?: () => void;
}) => {
  const theme = getStoryTheme(ctx.isDark);
  const [isUnlockedHere, setIsUnlockedHere] = useState(false);
  const isUnlocked = isUnlockedFromParent ?? isUnlockedHere;
  const content = getDayContent(slide, ctx);
  if (!content) {
    return null;
  }
  return (
    <DayLayout
      content={content}
      theme={theme}
      isUnlocked={isUnlocked}
      track={
        <SwipeToUnlock
          theme={theme}
          onUnlock={() => {
            setIsUnlockedHere(true);
            onUnlock?.();
          }}
        />
      }
    />
  );
};
