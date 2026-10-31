import noop from "lodash/noop";
import { useRef } from "react";
import type { View as ViewType } from "react-native";
import { StoryText } from "./parts";
import { useWeekLocale } from "@/hooks/use-week-locale";
import { getPlaygroundPages } from "./playground-pages";
import type { PlaygroundData, PlaygroundPage } from "./playground-pages";
import { SlideContent } from "./slides";
import { getStoryTheme } from "./theme";
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
  /** Deck id from `PLAYGROUND_SECTIONS`. */
  deck: string;
  data: Record<"week" | "month", PlaygroundData>;
  isDark: boolean;
  onClose: () => void;
}) => {
  const weekLocale = useWeekLocale();
  const pages = getPlaygroundPages(deck, data, isDark, weekLocale);
  const shareCard = useRef<ViewType>(null);

  const contentOf = ({ slide, ctx }: PlaygroundPage) => {
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
    theme: getStoryTheme(isDark),
    durationMs: getSlideDuration(page.slide),
    content: contentOf(page),
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
