import noop from "lodash/noop";
import { useRef, useState } from "react";
import { View } from "react-native";
import type { View as ViewType } from "react-native";
import { StoryText } from "./parts";
import { useWeekLocale } from "@/hooks/use-week-locale";
import { getPlaygroundPages } from "./playground-pages";
import type { PlaygroundData, PlaygroundPage } from "./playground-pages";
import { shareStoryCard } from "./share-image";
import { SlideContent } from "./slides";
import { getStoryTheme } from "./theme";
import { StoryFinale, StoryShuffleButton } from "./story-finale";
import { StoryPlayer } from "./story-player";
import type { PlayerSlide } from "./story-player";
import { StoryShareButton } from "./story-share-button";

/**
 * Story player over the pages of `deck`. Slides wait for a tap instead of
 * moving on. Share captures the slide as in the app; feedback is left out.
 */
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
  const slideView = useRef<ViewType>(null);
  const [shuffles, setShuffles] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // 3 photos of the pool; each shuffle moves on by 3, as in the app.
  const pickPhotos = (pool: PlaygroundPage["slide"] & { type: "share" }) =>
    pool.photos.length <= 3
      ? pool.photos
      : [0, 1, 2].flatMap((offset) => {
          const photo =
            pool.photos[(shuffles * 3 + offset) % pool.photos.length];
          return photo ? [photo] : [];
        });

  const contentOf = ({ slide, ctx }: PlaygroundPage) =>
    slide.type === "share" ? (
      <StoryFinale ctx={ctx} photos={pickPhotos(slide)} />
    ) : (
      <SlideContent slide={slide} ctx={ctx} />
    );

  const share = () => {
    if (isSharing) {
      return;
    }
    setIsSharing(true);
    setIsCapturing(true);
    void shareStoryCard({
      view: slideView.current,
      dialogTitle: "Playground",
      onCaptured: () => setIsCapturing(false),
      onDone: () => setIsSharing(false),
      onShared: noop,
    });
  };

  const slides: PlayerSlide[] = pages.map((page, index) => ({
    key: `${index}-${page.label}`,
    theme: getStoryTheme(isDark),
    // No timer: the playground holds each slide until a tap.
    isWaiting: true,
    content: contentOf(page),
  }));

  if (slides.length === 0) {
    return null;
  }

  return (
    <StoryPlayer
      slides={slides}
      slideRef={slideView}
      onClose={onClose}
      onSlideShown={noop}
      isPaused={isSharing}
      isCapturing={isCapturing}
      renderBottom={(index, theme) => {
        const page = pages[index];
        const canShuffle =
          page?.slide.type === "share" && page.slide.photos.length > 3;
        return (
          <View style={{ gap: 8 }} pointerEvents="box-none">
            <StoryText kind="label" theme={theme} tone="muted">
              {page?.label ?? "No slides"}
            </StoryText>
            <View
              pointerEvents="box-none"
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <StoryShareButton
                theme={theme}
                disabled={isSharing}
                onPress={share}
              />
              {canShuffle && (
                <StoryShuffleButton
                  theme={theme}
                  onPress={() => setShuffles((current) => current + 1)}
                />
              )}
            </View>
          </View>
        );
      }}
    />
  );
};
