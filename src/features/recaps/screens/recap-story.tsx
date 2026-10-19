import dayjs from "dayjs";
import noop from "lodash/noop";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { View } from "react-native";
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
import { buildMonthStory } from "../story/deck";
import { monthName } from "../story/format";
import { SlideBackdrop, SlideContent } from "../story/slides";
import { getSlideTheme } from "../story/slide-theme";
import type { SlideContext } from "../story/slides";
import { StoryFeedback } from "../story/story-feedback";
import { StoryPlayer } from "../story/story-player";
import type { PlayerSlide } from "../story/story-player";
import type { StorySlide } from "../story/types";
import { useRecapInput } from "../use-recap-input";

const SOURCES: StorySource[] = ["recaps", "calendar", "notification"];

const isSource = (value: unknown): value is StorySource =>
  SOURCES.some((source) => source === value);

/** Month story of `date`'s month. Closes when there is no story. */
const RecapStory = () => {
  const router = useRouter();
  const analytics = useAnalytics();
  const feedbackChannel = useFeedback();
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
    return <Redirect href="/settings" />;
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

  const slides: PlayerSlide[] = story.map((slide, index) => ({
    key: `${index}-${slide.type}`,
    theme: getSlideTheme(slide),
    backdrop: <SlideBackdrop slide={slide} />,
    content: <SlideContent slide={slide} ctx={ctx} />,
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
            style={{ flexDirection: "row", justifyContent: "flex-end" }}
            pointerEvents="box-none"
          >
            <StoryFeedback
              theme={theme}
              isAnswered={answers.has(index)}
              onHelpful={() => send(index, true, [], "")}
              onNotHelpful={() => setAsking(index)}
            />
          </View>
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
