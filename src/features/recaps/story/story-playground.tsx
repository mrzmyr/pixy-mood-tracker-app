import noop from "lodash/noop";
import { useRef, useState } from "react";
import type { View as ViewType } from "react-native";
import { StoryText } from "./parts";
import { useWeekLocale } from "@/hooks/use-week-locale";
import { getPlaygroundPages } from "./playground-pages";
import type { PlaygroundData, PlaygroundPage } from "./playground-pages";
import { QuizContent } from "./quiz-content";
import type { QuizResult } from "./quiz-content";
import { fillsScreen, slideBackdrop } from "./slide-layout";
import { getSlideTheme } from "./slide-theme";
import { SlideContent } from "./slides";
import { StoryFinale } from "./story-finale";
import { StoryPlayer } from "./story-player";
import type { PlayerSlide } from "./story-player";
import { getSlideDuration } from "./timing";

/** Story player over the pages of `deck`. Share and feedback do nothing. */
export const RecapStoryPlayground = ({
  deck,
  data,
  isDark,
  onClose,
}: {
  /** Id from `PLAYGROUND_DECKS`. */
  deck: string;
  data: Record<"week" | "month", PlaygroundData>;
  isDark: boolean;
  onClose: () => void;
}) => {
  const weekLocale = useWeekLocale();
  const pages = getPlaygroundPages(deck, data, isDark, weekLocale);
  const story = pages.map((page) => page.slide);
  const [quizResults, setQuizResults] = useState<
    ReadonlyMap<number, QuizResult>
  >(new Map());
  const shareCard = useRef<ViewType>(null);

  const contentOf = ({ slide, ctx }: PlaygroundPage, index: number) => {
    if (slide.type === "quiz") {
      return (
        <QuizContent
          slide={slide}
          ctx={ctx}
          result={quizResults.get(index) ?? null}
          onAnswer={(result) =>
            setQuizResults((current) => new Map([...current, [index, result]]))
          }
        />
      );
    }
    if (slide.type === "share") {
      return (
        <StoryFinale
          ctx={ctx}
          photos={slide.photos.slice(0, 3)}
          cardRef={shareCard}
          isSharing={false}
          onShare={noop}
          onShuffle={null}
        />
      );
    }
    return <SlideContent slide={slide} ctx={ctx} />;
  };

  const slides: PlayerSlide[] = pages.map((page, index) => ({
    key: `${index}-${page.label}`,
    theme: getSlideTheme(page.slide, isDark),
    renderBackdrop: (progress) => slideBackdrop(story, index, progress),
    isWaiting: page.slide.type === "quiz" && !quizResults.has(index),
    durationMs: getSlideDuration(page.slide),
    fillsScreen: fillsScreen(page.slide),
    content: contentOf(page, index),
  }));

  if (slides.length === 0) {
    return null;
  }

  return (
    <StoryPlayer
      slides={slides}
      onClose={onClose}
      onSlideShown={noop}
      renderBottom={(index, theme) => (
        <StoryText kind="label" theme={theme} tone="muted">
          {pages[index]?.label ?? "No slides"}
        </StoryText>
      )}
    />
  );
};
