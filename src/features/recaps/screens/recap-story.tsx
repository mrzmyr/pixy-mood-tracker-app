import dayjs from "dayjs";
import noop from "lodash/noop";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useColorScheme, View } from "react-native";
import type { View as ViewType } from "react-native";
import { setStatusBarHidden } from "expo-status-bar";
import { useFeedback } from "@/features/feedback";
import { usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
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
import { fillsScreen, slideBackdrop } from "../story/slide-layout";
import { getSlideTheme } from "../story/slide-theme";
import type { SlideContext } from "../story/slides";
import { StoryFeedback } from "../story/story-feedback";
import { StoryPlayer } from "../story/story-player";
import type { PlayerSlide } from "../story/story-player";
import type { StoryTheme } from "../story/theme";
import type { StoryPhoto, StorySlide } from "../story/types";
import { useRecapInput } from "../use-recap-input";
import { t } from "@/lib/translation";
import { StoryFinale } from "../story/story-finale";
import { getSlideDuration } from "../story/timing";
import { StoryShareButton } from "../story/story-share-button";
import { shareStoryCard } from "../story/share-image";
import { QuizContent } from "../story/quiz-content";
import type { QuizResult } from "../story/quiz-content";
import type { QuizSlide } from "../story/quiz";
import useHaptics from "@/hooks/use-haptics";

const SOURCES: StorySource[] = ["recaps", "calendar", "notification"];

const isSource = (value: unknown): value is StorySource =>
  SOURCES.some((source) => source === value);

/** Share, Helpful, Not Helpful. Every action pauses the story first. */
const StoryActions = ({
  theme,
  isSharing,
  isAnswered,
  pause,
  onShare,
  onHelpful,
  onNotHelpful,
}: {
  theme: StoryTheme;
  isSharing: boolean;
  isAnswered: boolean;
  pause: () => void;
  /** `null` on the last slide: it has its own wide share button. */
  onShare: (() => void) | null;
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
      {onShare ? (
        <StoryShareButton
          theme={theme}
          disabled={isSharing}
          onPress={paused(onShare)}
        />
      ) : (
        <View />
      )}
      <StoryFeedback
        theme={theme}
        isAnswered={isAnswered}
        onHelpful={paused(onHelpful)}
        onNotHelpful={paused(onNotHelpful)}
      />
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
  const story =
    kind === "week" ? buildWeekStory(input) : buildMonthStory(input);
  // "My September", or "My week" for a week story.
  const shareTitle =
    kind === "week"
      ? t("recaps_story_share_title_week")
      : t("recaps_story_share_title", { month: monthName(period.start) });
  const [answers, setAnswers] = useState<ReadonlyMap<number, boolean>>(
    new Map()
  );
  const [asking, setAsking] = useState<number | null>(null);
  const [quizResults, setQuizResults] = useState<
    ReadonlyMap<number, QuizResult>
  >(new Map());
  const shareCard = useRef<ViewType>(null);
  const slideView = useRef<ViewType>(null);
  const contentView = useRef<ViewType>(null);
  const [shuffles, setShuffles] = useState(0);
  // From the Share tap until the share sheet closes.
  const [isSharing, setIsSharing] = useState(false);
  // A plain slide shows the app icon and name while it is captured.
  const [isCapturingSlide, setIsCapturingSlide] = useState(false);
  const lastShown = useRef(0);

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

  const close = () => {
    analytics.track("recaps:story_closed", {
      position: lastShown.current + 1,
      slides_count: count,
      completed: lastShown.current === count - 1,
    });
    router.back();
  };

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

  const answerQuiz = (index: number, slide: QuizSlide, result: QuizResult) => {
    setQuizResults((current) => new Map([...current, [index, result]]));
    analytics.track("recaps:story_quiz_answered", {
      quiz: slide.quiz,
      module: slide.quiz === "truths" ? slide.module : null,
      is_correct: result.isCorrect,
    });
    if (result.isCorrect) {
      void haptics.success();
    }
  };

  /** 3 photos of the pool; each shuffle moves on by 3, wrapping around. */
  const pickPhotos = (pool: StoryPhoto[]) =>
    pool.length <= 3
      ? pool
      : [0, 1, 2].map((offset) => pool[(shuffles * 3 + offset) % pool.length]);

  /**
   * Shares the slide at `index` as an image. The share slide sends its card;
   * a full-screen slide sends itself without bars and buttons; every other
   * slide sends only its content.
   */
  const share = (index: number) => {
    const slide = story[index];
    if (isSharing || !slide) {
      return;
    }
    const isShareCard = slide.type === "share";
    setIsSharing(true);
    setIsCapturingSlide(!isShareCard);
    const slideRoot = fillsScreen(slide) ? slideView : contentView;
    void shareStoryCard({
      view: isShareCard ? shareCard.current : slideRoot.current,
      dialogTitle: shareTitle,
      onCaptured: () => setIsCapturingSlide(false),
      onDone: () => setIsSharing(false),
      onShared: () =>
        analytics.track("recaps:story_shared", {
          has_photos: isShareCard && slide.photos.length > 0,
          shuffles: isShareCard ? shuffles : 0,
          slide_type: slide.type,
        }),
    });
  };

  const contentOf = (slide: StorySlide, index: number) => {
    if (slide.type === "quiz") {
      return (
        <QuizContent
          slide={slide}
          ctx={ctx}
          result={quizResults.get(index) ?? null}
          onAnswer={(result) => answerQuiz(index, slide, result)}
        />
      );
    }
    if (slide.type === "share") {
      return (
        <StoryFinale
          ctx={ctx}
          photos={pickPhotos(slide.photos)}
          cardRef={shareCard}
          isSharing={isSharing}
          onShare={() => share(index)}
          onShuffle={
            slide.photos.length > 3
              ? () => setShuffles((current) => current + 1)
              : null
          }
        />
      );
    }
    return <SlideContent slide={slide} ctx={ctx} />;
  };

  const slides: PlayerSlide[] = story.map((slide, index) => ({
    key: `${index}-${slide.type}`,
    theme: getSlideTheme(slide, ctx.isDark),
    renderBackdrop: (progress) => slideBackdrop(story, index, progress),
    isWaiting: slide.type === "quiz" && !quizResults.has(index),
    durationMs: getSlideDuration(slide),
    fillsScreen: fillsScreen(slide),
    content: contentOf(slide, index),
  }));

  return (
    <View style={{ flex: 1 }}>
      <StoryPlayer
        slides={slides}
        slideRef={slideView}
        contentRef={contentView}
        onClose={close}
        isPaused={asking !== null || isSharing}
        isCapturing={isCapturingSlide}
        onSlideShown={(index) => {
          lastShown.current = index;
          const slide = slideOf(index);
          if (slide) {
            analytics.track("recaps:story_slide_shown", {
              slide_type: slide.type,
              position: index + 1,
              slides_count: count,
            });
          }
        }}
        renderBottom={(index, theme, controls) => (
          <StoryActions
            theme={theme}
            isSharing={isSharing}
            isAnswered={answers.has(index)}
            pause={controls.pause}
            onShare={story[index]?.type === "share" ? null : () => share(index)}
            onHelpful={() => send(index, true, [], "")}
            onNotHelpful={() => setAsking(index)}
          />
        )}
      />
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
    </View>
  );
};

/** Month story behind flag `recaps`. Deep links with the flag off go to Settings. */
export const RecapStoryScreen = () =>
  useFeatureFlag("recaps") ? <RecapStory /> : <Redirect href="/settings" />;
