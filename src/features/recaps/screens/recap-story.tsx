import dayjs from "dayjs";
import noop from "lodash/noop";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { BackHandler, useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { setStatusBarHidden } from "expo-status-bar";
import { useFeedback } from "@/features/feedback";
import { usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import useHaptics from "@/hooks/use-haptics";
import { useWeekLocale } from "@/hooks/use-week-locale";
import { useAnalytics } from "@/state/analytics";
import type { StorySource } from "@/state/analytics/events";
import { useFeatureFlag } from "@/state/feature-flags";
import { FeedbackSheet } from "../components/feedback-sheet";
import type { FeedbackReason } from "../feedback-reasons";
import { getPeriod } from "../period";
import { buildMonthStory, buildWeekStory } from "../story/deck";
import { monthName } from "../story/format";
import { SlideContent } from "../story/slides";
import type { SlideContext } from "../story/slides";
import { StoryFeedback } from "../story/story-feedback";
import { StoryPlayer } from "../story/story-player";
import type { PlayerSlide } from "../story/story-player";
import { getStoryTheme } from "../story/theme";
import { MissedTagSheet } from "../story/missed-tag-sheet";
import { useRoughNights } from "../story/use-rough-nights";
import type { StoryTheme } from "../story/theme";
import type { StoryPhoto, StorySlide } from "../story/types";
import { useRecapInput } from "../use-recap-input";
import { t } from "@/lib/translation";
import { StoryFinale, StoryShuffleButton } from "../story/story-finale";
import { getSlideDuration } from "../story/timing";
import { StoryShareButton } from "../story/story-share-button";
import { useShareFrame } from "../story/use-share-frame";
import { getStoryCardKey, parseStoryOrigin } from "../story/story-motion";
import {
  StoryTransitionView,
  useStoryTransition,
} from "../story/story-transition";

const SOURCES: StorySource[] = ["recaps", "calendar", "notification"];

const isSource = (value: unknown): value is StorySource =>
  SOURCES.some((source) => source === value);

/** Rough-night slides hold hard evenings: never shared as an image. */
const isPrivate = (slide: StorySlide | undefined) =>
  slide?.type === "rough-night" || slide?.type === "rough-nights-all";

/**
 * Share bottom left; Helpful and Not Helpful bottom right, or Shuffle on the
 * last slide. Share and feedback pause the story first. No Share on
 * `isPrivate` slides.
 */
const StoryActions = ({
  theme,
  isSharing,
  isAnswered,
  canShare,
  pause,
  onShare,
  onShuffle,
  onHelpful,
  onNotHelpful,
}: {
  theme: StoryTheme;
  isSharing: boolean;
  isAnswered: boolean;
  canShare: boolean;
  pause: () => void;
  onShare: () => void;
  /** Last slide with more than 3 photos: 3 other photos on the card. */
  onShuffle: (() => void) | null;
  onHelpful: () => void;
  onNotHelpful: () => void;
}) => {
  const paused = (action: () => void) => () => {
    pause();
    action();
  };
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
      pointerEvents="box-none"
    >
      {canShare ? (
        <StoryShareButton
          theme={theme}
          disabled={isSharing}
          onPress={paused(onShare)}
        />
      ) : (
        <View />
      )}
      {onShuffle ? (
        <StoryShuffleButton theme={theme} onPress={onShuffle} />
      ) : (
        <StoryFeedback
          theme={theme}
          isAnswered={isAnswered}
          onHelpful={paused(onHelpful)}
          onNotHelpful={paused(onNotHelpful)}
        />
      )}
    </View>
  );
};

/** Month story of `date`'s month. Without a story, the month's cards. */
const RecapStory = () => {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const analytics = useAnalytics();
  const feedbackChannel = useFeedback();
  const haptics = useHaptics();
  const weekLocale = useWeekLocale();
  const params = useLocalSearchParams<{
    date?: string;
    source?: string;
    kind?: string;
    origin?: string;
  }>();
  const kind = params.kind === "week" ? "week" : "month";
  const date = dayjs(params.date).isValid()
    ? dayjs(params.date).format("YYYY-MM-DD")
    : dayjs().subtract(1, kind).format("YYYY-MM-DD");
  const source = isSource(params.source) ? params.source : "recaps";
  const period = getPeriod(kind, date, weekLocale);
  const input = useRecapInput(period);
  const { tags } = useTagsState();
  const { people } = usePeopleState();
  const rough = useRoughNights(
    kind === "week" ? buildWeekStory(input) : buildMonthStory(input),
    useFeatureFlag("recap-sleep")
  );
  const { story } = rough;
  // "My September", or "My week" for a week story.
  const shareTitle =
    kind === "week"
      ? t("recaps_story_share_title_week")
      : t("recaps_story_share_title", { month: monthName(period.start) });
  const [answers, setAnswers] = useState<ReadonlyMap<number, boolean>>(
    new Map()
  );
  const [asking, setAsking] = useState<number | null>(null);
  // Person tapped on each quiz slide, by slide index.
  const [picks, setPicks] = useState<ReadonlyMap<number, string>>(new Map());
  const [shuffles, setShuffles] = useState(0);
  const { isSharing, share: shareFrame, frame } = useShareFrame();
  const lastShown = useRef(0);
  // A swipe down closes the story only on the first slide; later it pages back.
  const [isFirstShown, setIsFirstShown] = useState(true);
  // The best day slide waits for the swipe; once open it stays open.
  const [isBestDayUnlocked, setIsBestDayUnlocked] = useState(false);
  const transition = useStoryTransition({
    origin: parseStoryOrigin(params.origin),
    cardKey: getStoryCardKey({ source, kind, date: period.start }),
    onClosed: () => router.back(),
    canDrag: isFirstShown,
  });

  const ctx: SlideContext = {
    period,
    days: input.days,
    history: input.history,
    today: input.today,
    tags: new Map(tags.map((tag) => [tag.id, tag])),
    people: new Map(people.map((person) => [person.id, person])),
    isDark: colorScheme === "dark",
  };

  const count = story?.length ?? 0;
  const onOpen = useEffectEvent(() => {
    if (story) {
      analytics.track("recaps:story_opened", {
        period: kind,
        source,
        slides_count: count,
      });
      analytics.track("recaps:story_slide_shown", {
        slide_type: story[0]?.type ?? "cover",
        position: 1,
        slides_count: count,
      });
    }
  });
  const close = () => {
    analytics.track("recaps:story_closed", {
      position: lastShown.current + 1,
      slides_count: count,
      completed: lastShown.current === count - 1,
    });
    void transition.close();
  };

  const onBack = useEffectEvent(() => {
    close();
    return true;
  });
  useEffect(() => {
    // Android back shrinks the story into its card, like the close button.
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBack
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    onOpen();
    // Full-screen story: the progress bars take the status bar's place.
    setStatusBarHidden(true, "fade");
    return () => setStatusBarHidden(false, "fade");
  }, []);

  if (!story) {
    // No story for the month: its cards instead, e.g. from a notification.
    return (
      <Redirect
        href={{
          pathname: "/recaps/[kind]/[date]",
          params: { kind, date: period.start },
        }}
      />
    );
  }

  const slideOf = (index: number): StorySlide | undefined => story[index];

  const send = (
    index: number,
    helpful: boolean,
    reasons: FeedbackReason[],
    note: string
  ) => {
    const slide = slideOf(index);
    if (!slide) {
      return;
    }
    analytics.track("recaps:story_feedback_sent", {
      slide_type: slide.type,
      position: index + 1,
      helpful,
      reasons,
      has_note: note.length > 0,
    });
    if (note.length > 0) {
      // Notes go to the Pixy team like other feedback, never to analytics.
      void feedbackChannel.send({
        type: "other",
        source: "recaps",
        message: `${note}\n\nRecap story slide: ${slide.type}`,
        onOk: noop,
      });
    }
    setAnswers((current) => new Map([...current, [index, helpful]]));
  };

  const pick = (index: number, personId: string) => {
    const slide = slideOf(index);
    if (slide?.type !== "people-quiz" || picks.has(index)) {
      return;
    }
    const isCorrect = personId === slide.answer;
    setPicks((current) => new Map([...current, [index, personId]]));
    analytics.track("recaps:story_quiz_answered", { is_correct: isCorrect });
    void (isCorrect ? haptics.success() : haptics.selection());
  };

  /** 3 photos of the pool; each shuffle moves on by 3, wrapping around. */
  const pickPhotos = (pool: StoryPhoto[]) =>
    pool.length <= 3
      ? pool
      : [0, 1, 2].map((offset) => pool[(shuffles * 3 + offset) % pool.length]);

  /**
   * Shares the slide at `index` as an image: a calm card with the heading,
   * the slide's content, and the app, drawn behind the story (`ShareFrame`).
   * Capture starts once the card is laid out and its images loaded.
   */
  const share = (index: number) => {
    const slide = story[index];
    if (!slide) {
      return;
    }
    const isShareCard = slide.type === "share";
    shareFrame({
      slide,
      ctx,
      photos: isShareCard ? pickPhotos(slide.photos) : [],
      dialogTitle: shareTitle,
      onShared: () =>
        analytics.track("recaps:story_shared", {
          has_photos: isShareCard && slide.photos.length > 0,
          shuffles: isShareCard ? shuffles : 0,
          slide_type: slide.type,
        }),
    });
  };

  /** Shuffle on the share slide when more than 3 photos wait in the pool. */
  const shuffleOf = (index: number) => {
    const slide = slideOf(index);
    return slide?.type === "share" && slide.photos.length > 3
      ? () => setShuffles((current) => current + 1)
      : null;
  };

  const contentOf = (slide: StorySlide, index: number) => {
    if (slide.type === "share") {
      return <StoryFinale ctx={ctx} photos={pickPhotos(slide.photos)} />;
    }
    return (
      <SlideContent
        slide={slide}
        ctx={ctx}
        quiz={{
          picked: picks.get(index) ?? null,
          onPick: (personId) => pick(index, personId),
        }}
        lock={{
          isUnlocked: isBestDayUnlocked,
          onUnlock: () => setIsBestDayUnlocked(true),
        }}
        rough={rough.controls}
      />
    );
  };

  const slides: PlayerSlide[] = story.map((slide, index) => {
    const duration = getSlideDuration(slide, kind);
    return {
      key: `${index}-${slide.type}`,
      theme: getStoryTheme(ctx.isDark),
      // A quiz waits for the answer, the best day for its unlock, slides with
      // own buttons for a tap. Then the story plays on.
      isWaiting:
        (slide.type === "people-quiz" && !picks.has(index)) ||
        (slide.type === "best-day" && !isBestDayUnlocked) ||
        rough.hasOwnButtons(slide),
      durationMs: duration ?? undefined,
      isHeld: duration === null,
      hasOwnButtons: rough.hasOwnButtons(slide),
      content: contentOf(slide, index),
    };
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {frame}
      <StoryTransitionView transition={transition}>
        <StoryPlayer
          slides={slides}
          onClose={close}
          // The timer starts once the story is full screen; a drag holds it.
          isPaused={
            asking !== null ||
            rough.isMissedOpen ||
            isSharing ||
            !transition.isOpen ||
            transition.isDragging
          }
          onSlideShown={(index) => {
            lastShown.current = index;
            setIsFirstShown(index === 0);
            const slide = slideOf(index);
            if (slide) {
              analytics.track("recaps:story_slide_shown", {
                slide_type: slide.type,
                position: index + 1,
                slides_count: count,
              });
            }
          }}
          renderBottom={(index, theme, controls) =>
            rough.hasOwnButtons(slideOf(index)) ? null : (
              <StoryActions
                theme={theme}
                isSharing={isSharing}
                isAnswered={answers.has(index)}
                canShare={!isPrivate(slideOf(index))}
                pause={controls.pause}
                onShare={() => share(index)}
                onShuffle={shuffleOf(index)}
                onHelpful={() => send(index, true, [], "")}
                onNotHelpful={() => setAsking(index)}
              />
            )
          }
        />
      </StoryTransitionView>
      {rough.missed && <MissedTagSheet {...rough.missed} />}
      <FeedbackSheet
        visible={asking !== null}
        onCancel={() => setAsking(null)}
        onSend={(reasons, note) => {
          if (asking !== null) {
            send(asking, false, reasons, note);
          }
          setAsking(null);
        }}
      />
    </GestureHandlerRootView>
  );
};

/** Month story behind flag `recaps`. Deep links with the flag off go to Settings. */
export const RecapStoryScreen = () =>
  useFeatureFlag("recaps") ? <RecapStory /> : <Redirect href="/settings" />;
