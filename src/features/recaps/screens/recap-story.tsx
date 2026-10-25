import dayjs from "dayjs";
import noop from "lodash/noop";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import type { View as ViewType } from "react-native";
import ShareIcon from "lucide-react-native/icons/share";
import { setStatusBarHidden } from "expo-status-bar";
import { useFeedback } from "@/features/feedback";
import { getAverageMood } from "@/features/logs";
import { usePeopleState } from "@/features/people";
import { useStoreReviewPrompt } from "@/features/review";
import { useTagsState } from "@/features/tags";
import { useWeekLocale } from "@/hooks/use-week-locale";
import { useAnalytics } from "@/state/analytics";
import type { StorySource } from "@/state/analytics/events";
import { useFeatureFlag } from "@/state/feature-flags";
import { FeedbackSheet } from "../components/feedback-sheet";
import type { FeedbackReason } from "../feedback-reasons";
import { getPeriod } from "../period";
import { buildMonthStory } from "../story/deck";
import { monthName } from "../story/format";
import { SlideBackdrop, SlideContent } from "../story/slides";
import { getSlideTheme } from "../story/slide-theme";
import type { SlideContext } from "../story/slides";
import { StoryFeedback } from "../story/story-feedback";
import { StoryPlayer } from "../story/story-player";
import type { PlayerSlide } from "../story/story-player";
import type { StoryPhoto, StorySlide } from "../story/types";
import { useRecapInput } from "../use-recap-input";
import { RADIUS } from "@/constants/radius";
import { t } from "@/lib/translation";
import { ShareCard } from "../story/share-card";
import { shareStoryCard } from "../story/share-image";
import { Celebration } from "../story/celebration";
import type { CelebrationKind, CelebrationOrigin } from "../story/celebration";
import { StoryText, useDayColors } from "../story/parts";
import { QuizContent } from "../story/quiz-content";
import type { QuizResult } from "../story/quiz-content";
import type { QuizSlide } from "../story/quiz";
import useHaptics from "@/hooks/use-haptics";

const SOURCES: StorySource[] = ["recaps", "calendar", "notification"];

const isSource = (value: unknown): value is StorySource =>
  SOURCES.some((source) => source === value);

/** Month story of `date`'s month. Without a story, the month's cards. */
const RecapStory = () => {
  const router = useRouter();
  const analytics = useAnalytics();
  const feedbackChannel = useFeedback();
  const haptics = useHaptics();
  const requestStoreReviewPrompt = useStoreReviewPrompt();
  const weekLocale = useWeekLocale();
  const params = useLocalSearchParams<{ date?: string; source?: string }>();
  const date = dayjs(params.date).isValid()
    ? dayjs(params.date).format("YYYY-MM-DD")
    : dayjs().subtract(1, "month").format("YYYY-MM-DD");
  const source = isSource(params.source) ? params.source : "recaps";
  const period = getPeriod("month", date, weekLocale);
  const input = useRecapInput(period);
  const { tags } = useTagsState();
  const { people } = usePeopleState();
  const story = buildMonthStory(input);
  const [answers, setAnswers] = useState<ReadonlyMap<number, boolean>>(
    new Map()
  );
  const [asking, setAsking] = useState<number | null>(null);
  const [quizResults, setQuizResults] = useState<
    ReadonlyMap<number, QuizResult>
  >(new Map());
  const [celebration, setCelebration] = useState<{
    kind: CelebrationKind;
    origin: CelebrationOrigin;
    id: number;
  } | null>(null);
  const dayColors = [...new Set(useDayColors(input.days).values())];
  const shareCard = useRef<ViewType>(null);
  const [shuffles, setShuffles] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const lastShown = useRef(0);

  const ctx: SlideContext = {
    period,
    days: input.days,
    history: input.history,
    today: input.today,
    tags: new Map(tags.map((tag) => [tag.id, tag])),
    people: new Map(people.map((person) => [person.id, person])),
  };

  const count = story?.length ?? 0;
  const onOpen = useEffectEvent(() => {
    if (story) {
      analytics.track("recaps:story_opened", {
        period: "month",
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
          params: { kind: "month", date: period.start },
        }}
      />
    );
  }

  const slideOf = (index: number): StorySlide | undefined => story[index];

  const close = () => {
    const completed = lastShown.current === count - 1;
    analytics.track("recaps:story_closed", {
      position: lastShown.current + 1,
      slides_count: count,
      completed,
    });
    router.back();
    // A story played to the end is a store review moment.
    if (completed) {
      requestStoreReviewPrompt({
        kind: "month_story_end",
        averageRating: getAverageMood(input.days.flatMap((day) => day.items)),
        hasNotHelpfulAnswer: [...answers.values()].includes(false),
      });
    }
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

  const answerQuiz = (
    index: number,
    slide: QuizSlide,
    result: QuizResult,
    origin: CelebrationOrigin
  ) => {
    setQuizResults((current) => new Map([...current, [index, result]]));
    analytics.track("recaps:story_quiz_answered", {
      quiz: slide.quiz,
      module: slide.quiz === "truths" ? slide.module : null,
      is_correct: result.isCorrect,
    });
    if (result.isCorrect) {
      void haptics.success();
      // CE2 for "Which ones are true?": every card right is the bigger win.
      setCelebration({
        kind: slide.quiz === "truths" ? "wave" : "burst",
        origin,
        id: (celebration?.id ?? 0) + 1,
      });
    }
  };

  /** 3 photos of the pool; each shuffle moves on by 3, wrapping around. */
  const pickPhotos = (pool: StoryPhoto[]) =>
    pool.length === 0
      ? []
      : [0, 1, 2].map((offset) => pool[(shuffles * 3 + offset) % pool.length]);

  const shareSlide = story.find((slide) => slide.type === "share");
  const share = () => {
    if (isCapturing || shareSlide?.type !== "share") {
      return;
    }
    setIsCapturing(true);
    void shareStoryCard({
      view: shareCard.current,
      dialogTitle: t("recaps_story_share_title", {
        month: monthName(period.start),
      }),
      onCaptured: () => setIsCapturing(false),
      onShared: () =>
        analytics.track("recaps:story_shared", {
          has_photos: shareSlide.photos.length > 0,
          shuffles,
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
          onAnswer={(result, origin) =>
            answerQuiz(index, slide, result, origin)
          }
        />
      );
    }
    if (slide.type === "share") {
      return (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ShareCard
            ctx={ctx}
            photos={pickPhotos(slide.photos)}
            facts={slide.facts}
            cardRef={shareCard}
            onShuffle={
              slide.photos.length > 3
                ? () => setShuffles((current) => current + 1)
                : null
            }
          />
        </View>
      );
    }
    return <SlideContent slide={slide} ctx={ctx} />;
  };

  const slides: PlayerSlide[] = story.map((slide, index) => ({
    key: `${index}-${slide.type}`,
    theme: getSlideTheme(slide),
    backdrop: <SlideBackdrop slide={slide} />,
    isWaiting: slide.type === "quiz" && !quizResults.has(index),
    content: contentOf(slide, index),
  }));

  return (
    <View style={{ flex: 1 }}>
      <StoryPlayer
        slides={slides}
        title={monthName(period.start)}
        onClose={close}
        isPaused={asking !== null}
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
        renderBottom={(index, theme) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            pointerEvents="box-none"
          >
            {story[index]?.type === "share" ? (
              <Pressable
                accessibilityRole="button"
                onPress={share}
                disabled={isCapturing}
                testID="recap-story-share"
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 44,
                  paddingHorizontal: 18,
                  borderRadius: RADIUS.full,
                  backgroundColor: "#0A0A0A",
                  opacity: pressed || isCapturing ? 0.7 : 1,
                })}
              >
                <ShareIcon width={16} height={16} color="#FFFFFF" />
                <StoryText kind="label" theme="night" style={{ fontSize: 15 }}>
                  {t("recaps_story_share")}
                </StoryText>
              </Pressable>
            ) : (
              <View />
            )}
            <StoryFeedback
              theme={theme}
              isAnswered={answers.has(index)}
              onHelpful={() => send(index, true, [], "")}
              onNotHelpful={() => setAsking(index)}
            />
          </View>
        )}
      />
      {celebration && (
        <Celebration
          key={celebration.id}
          kind={celebration.kind}
          origin={celebration.origin}
          colors={dayColors}
        />
      )}
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
