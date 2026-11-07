import dayjs from "dayjs";
import { Image } from "expo-image";
import { use, useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
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
import { getPhotoFile } from "@/features/photos";
import { t, tDynamic } from "@/lib/translation";
import { RingedAvatar } from "../components/ringed-avatar";
import {
  GlassChip,
  Reveal,
  RevealText,
  SlideHeader,
  StoryImage,
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
/** Locked preview of the day: see-through, photos blurred. */
const PREVIEW_OPACITY = 0.55;
const PREVIEW_BLUR = 24;
const PREVIEW_FADE_MS = 300;
/** Pill widths of the chip skeletons, in turn. */
const CHIP_WIDTHS = [88, 64, 104, 72];

/** Time between two photos, and from one block to the next. */
const PHOTO_STEP_MS = 450;
const BLOCK_STEP_MS = 500;
/** Pause after the swipe before the first photo shows. */
const OPEN_DELAY_MS = 200;
const MAX_PHOTOS = 3;
const MAX_PEOPLE = 4;

/** Photo `index` shows this long after the swipe. */
const photoAt = (index: number) => OPEN_DELAY_MS + index * PHOTO_STEP_MS;

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

/** Gray bar or pill in place of text the swipe will show. */
const Skeleton = ({
  theme,
  width,
  height,
}: {
  theme: StoryTheme;
  width: number | `${number}%`;
  height: number;
}) => {
  const palette = STORY_PALETTE[theme];
  return (
    <View
      style={{
        width,
        height,
        borderRadius: RADIUS.full,
        backgroundColor: palette.glass,
        borderWidth: 1,
        borderColor: palette.chipBorder,
      }}
    />
  );
};

/**
 * Locked look at the day, in the order of the open day: blurred photos,
 * and gray bars for the title, people, emotions, and tags. It tells what the
 * swipe will show and shows nothing of it. Shorter than the open day, so
 * Pixy keeps sky to fly in. Screen readers skip it.
 */
const DayPreview = ({
  content,
  theme,
}: {
  content: NonNullable<ReturnType<typeof getDayContent>>;
  theme: StoryTheme;
}) => {
  const { photos, people, shownPeople, emotions, tags } = content;
  // Emotions and tags share one row of pills: the preview stays short.
  const chipCount = emotions.length + tags.length;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID="recap-story-best-day-preview"
      style={{
        gap: STORY_BLOCK_GAP,
        opacity: PREVIEW_OPACITY,
        overflow: "hidden",
        flexShrink: 1,
      }}
    >
      {photos.length > 0 && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {photos.map((photo) => (
            <View key={photo.id} style={{ flex: 1 }}>
              <Image
                source={{ uri: getPhotoFile(photo).uri }}
                recyclingKey={photo.id}
                contentFit="cover"
                blurRadius={PREVIEW_BLUR}
                accessible={false}
                style={{
                  width: "100%",
                  aspectRatio: photos.length === 1 ? 2 : 1,
                  borderRadius: RADIUS.lg,
                }}
              />
            </View>
          ))}
        </View>
      )}
      <Skeleton theme={theme} width="80%" height={24} />
      {people.length > 0 && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {shownPeople.map((person) => (
            <Skeleton key={person.id} theme={theme} width={28} height={28} />
          ))}
          <Skeleton theme={theme} width="36%" height={14} />
        </View>
      )}
      {chipCount > 0 && (
        <View style={{ flexDirection: "row", gap: 8, overflow: "hidden" }}>
          {CHIP_WIDTHS.slice(0, chipCount).map((width) => (
            <Skeleton key={width} theme={theme} width={width} height={34} />
          ))}
        </View>
      )}
    </View>
  );
};

/**
 * Best day of the month. Locked first: the question, a preview of the day,
 * and a swipe track, and the story waits. After the swipe the day builds up:
 * photos one by one, the title, then people, emotions, and tags. Long days
 * scroll.
 */
const OpenDay = ({
  content,
  theme,
}: {
  content: NonNullable<ReturnType<typeof getDayContent>>;
  theme: StoryTheme;
}) => {
  const { day, photos, people, shownPeople, emotions, tags } = content;
  const names = [
    ...shownPeople.map((person) => person.name),
    ...(people.length > MAX_PEOPLE
      ? [t("recaps_connected_more", { count: people.length - MAX_PEOPLE })]
      : []),
  ].join(", ");

  const title = t("recaps_day_best_title_month", {
    day: dayjs(day.date).format("dddd, D MMMM"),
  });
  const titleAt = photoAt(photos.length) + (photos.length > 0 ? 300 : 0);
  const peopleAt = titleAt + revealTextMs(title) + 200;
  const emotionsAt =
    peopleAt + (people.length > 0 ? BLOCK_STEP_MS + revealTextMs(names) : 0);
  const tagsAt =
    emotionsAt +
    (emotions.length > 0 ? BLOCK_STEP_MS + emotions.length * 120 : 0);

  return (
    <>
      <ScrollView
        // Content height, shrinking to scroll when the day is long; cloud
        // Pixy flies in the sky left below.
        style={{ flexGrow: 0, flexShrink: 1 }}
        contentContainerStyle={{ gap: STORY_BLOCK_GAP, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {photos.length > 0 && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            {photos.map((photo, index) => (
              <Reveal key={photo.id} at={photoAt(index)} style={{ flex: 1 }}>
                <StoryImage
                  photo={photo}
                  style={{
                    width: "100%",
                    aspectRatio: photos.length === 1 ? 4 / 3 : 3 / 4,
                    borderRadius: RADIUS.lg,
                  }}
                />
              </Reveal>
            ))}
          </View>
        )}
        <RevealText text={title} at={titleAt} kind="title" theme={theme} />
        {people.length > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {shownPeople.map((person, index) => (
              <Reveal key={person.id} at={peopleAt + index * 120}>
                <RingedAvatar person={person} size={28} />
              </Reveal>
            ))}
            <View style={{ flexShrink: 1 }}>
              <RevealText
                text={names}
                at={peopleAt + shownPeople.length * 120}
                kind="body"
                theme={theme}
                tone="muted"
              />
            </View>
          </View>
        )}
        {emotions.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {emotions.map((emotion, index) => (
              <Reveal key={emotion.key} at={emotionsAt + index * 120}>
                <GlassChip
                  theme={theme}
                  marker={<EmotionIndicator emotion={emotion} compact />}
                  label={tDynamic(`log_emotion_${emotion.key}`)}
                />
              </Reveal>
            ))}
          </View>
        )}
        {tags.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {tags.map((tag, index) => (
              <Reveal key={tag.id} at={tagsAt + index * 120}>
                <GlassChip
                  theme={theme}
                  marker={<TagDot tag={tag} />}
                  label={tag.title}
                />
              </Reveal>
            ))}
          </View>
        )}
      </ScrollView>
      <SkyFlightZone style={{ flex: 1, marginTop: STORY_BLOCK_GAP }} />
    </>
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
  if (isUnlocked) {
    return <OpenDay content={content} theme={theme} />;
  }
  const title = t("recaps_story_best_day_ask");
  const previewAt = titleRevealEnd(title);
  // Question on top, the locked day below it, Pixy's free sky between it and
  // the track at the bottom.
  return (
    <View style={{ flex: 1 }}>
      <SlideHeader theme={theme} title={title} />
      <Reveal
        at={previewAt}
        style={{ flexShrink: 1, marginTop: STORY_TITLE_GAP }}
      >
        <Animated.View exiting={FadeOut.duration(PREVIEW_FADE_MS)}>
          <DayPreview content={content} theme={theme} />
        </Animated.View>
      </Reveal>
      <SkyFlightZone style={{ flex: 1, marginVertical: STORY_BLOCK_GAP }} />
      <Reveal at={previewAt + BLOCK_STEP_MS}>
        <SwipeToUnlock
          theme={theme}
          onUnlock={() => {
            setIsUnlockedHere(true);
            onUnlock?.();
          }}
        />
      </Reveal>
    </View>
  );
};
