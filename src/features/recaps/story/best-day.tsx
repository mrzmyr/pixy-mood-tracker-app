import dayjs from "dayjs";
import { use, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import ChevronsRight from "lucide-react-native/icons/chevrons-right";
import { CLOUD_PIXY_SIZE } from "@/components/cloud-pixy";
import { cheer, PixyGuideContext } from "@/components/pixy-guide-context";
import { SkyFlightZone } from "@/components/sky-flight-zone";
import { RADIUS } from "@/constants/radius";
import { EmotionIndicator, EMOTIONS } from "@/features/logger";
import { t, tDynamic } from "@/lib/translation";
import { RingedAvatar } from "../components/ringed-avatar";
import {
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
  STORY_PALETTE,
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
/** Cloud Pixy glides from its sky to the thumb this long, after this delay. */
const PIXY_CALL_DELAY_MS = 600;
const PIXY_GLIDE_MS = 1100;
const PIXY_GLIDE_EASING = Easing.inOut(Easing.cubic);
/** Pixy's center sits this far above the track top: just over the thumb. */
const PIXY_HOVER_GAP = CLOUD_PIXY_SIZE * 0.42;
/** Pixy cheers this long before the day opens. */
const CHEER_MS = 800;

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
 * Track with a thumb the user drags to the end. Releases short of
 * `UNLOCK_SHARE` slide the thumb back. Screen readers get one button.
 * Cloud Pixy flies over and hovers above the thumb, follows it, and sends
 * more hearts the further it goes. On unlock Pixy cheers, then the day opens.
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
      guide?.follow.set(
        withDelay(
          PIXY_CALL_DELAY_MS,
          withTiming(1, { duration: PIXY_GLIDE_MS, easing: PIXY_GLIDE_EASING })
        )
      );
    });
  };

  const unlock = () => {
    if (isUnlocking.current) {
      return;
    }
    isUnlocking.current = true;
    if (guide) {
      cheer(guide);
    }
    cheerTimer.current = setTimeout(onUnlock, guide ? CHEER_MS : 0);
  };

  const gesture = usePanGesture({
    enabled: travel > 0,
    maxPointers: 1,
    activeOffsetX: 8,
    failOffsetY: [-12, 12],
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
        scheduleOnRN(unlock);
      }
    },
  });
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() }],
  }));
  const hintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.get(), [0, travel * 0.6 || 1], [1, 0], "clamp"),
  }));
  const label = t("recaps_story_best_day_swipe");
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
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              alignItems: "center",
              justifyContent: "center",
              paddingLeft: THUMB_SIZE,
            },
            hintStyle,
          ]}
        >
          <StoryText kind="label" theme={theme} tone="muted">
            {label}
          </StoryText>
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

/** Emotion or tag on the sky: marker and name on a glass chip. */
const GlassChip = ({
  theme,
  marker,
  label,
}: {
  theme: StoryTheme;
  marker: React.ReactNode;
  label: string;
}) => {
  const palette = STORY_PALETTE[theme];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: RADIUS.md,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: palette.glassBorder,
        backgroundColor: palette.glass,
      }}
    >
      {marker}
      <StoryText kind="label" theme={theme} numberOfLines={1}>
        {label}
      </StoryText>
    </View>
  );
};

/**
 * Best day of the month. Locked first: the question and a swipe track, and
 * the story waits. After the swipe the day builds up: photos one by one,
 * the title, then people, emotions, and tags. Long days scroll.
 */
const OpenDay = ({
  slide,
  ctx,
}: {
  slide: BestDaySlide;
  ctx: SlideContext;
}) => {
  const theme = getStoryTheme(ctx.isDark);
  const day = ctx.days.find((item) => item.date === slide.date);
  if (!day) {
    return null;
  }
  const photos = day.items.flatMap((item) => item.photos).slice(0, MAX_PHOTOS);
  const people = [
    ...new Set(day.items.flatMap((item) => item.people.map(({ id }) => id))),
  ].flatMap((id) => ctx.people.get(id) ?? []);
  const shownPeople = people.slice(0, MAX_PEOPLE);
  const names = [
    ...shownPeople.map((person) => person.name),
    ...(people.length > MAX_PEOPLE
      ? [t("recaps_connected_more", { count: people.length - MAX_PEOPLE })]
      : []),
  ].join(", ");
  const emotions = [
    ...new Set(day.items.flatMap((item) => item.emotions)),
  ].flatMap((key) => {
    const emotion = EMOTION_BY_KEY.get(key);
    return emotion && GOOD.has(emotion.category) ? [emotion] : [];
  });
  const tags = [
    ...new Set(day.items.flatMap((item) => item.tags.map(({ id }) => id))),
  ].flatMap((id) => ctx.tags.get(id) ?? []);

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
  if (isUnlocked) {
    return <OpenDay slide={slide} ctx={ctx} />;
  }
  const title = t("recaps_story_best_day_ask");
  // Question on top, track at the bottom: Pixy flies down to the thumb.
  return (
    <View style={{ flex: 1, justifyContent: "space-between" }}>
      <SlideHeader theme={theme} title={title} />
      <Reveal at={titleRevealEnd(title)}>
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
