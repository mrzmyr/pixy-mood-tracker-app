import noop from "lodash/noop";
import { useState } from "react";
import { View } from "react-native";
import { StoryText } from "./parts";
import { useWeekLocale } from "@/hooks/use-week-locale";
import { getPlaygroundPages } from "./playground-pages";
import type { PlaygroundData, PlaygroundPage } from "./playground-pages";
import { SlideContent } from "./slides";
import { getStoryTheme } from "./theme";
import { StoryFinale, StoryShuffleButton } from "./story-finale";
import { StoryPlayer } from "./story-player";
import type { PlayerSlide } from "./story-player";
import { StoryShareButton } from "./story-share-button";
import { useShareFrame } from "./use-share-frame";

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
  const [shuffles, setShuffles] = useState(0);
  const { isSharing, share: shareFrame, frame } = useShareFrame();
  const [picks, setPicks] = useState<ReadonlyMap<number, string>>(new Map());

  // 3 photos of the pool; each shuffle moves on by 3, as in the app.
  const pickPhotos = (pool: PlaygroundPage["slide"] & { type: "share" }) =>
    pool.photos.length <= 3
      ? pool.photos
      : [0, 1, 2].flatMap((offset) => {
          const photo =
            pool.photos[(shuffles * 3 + offset) % pool.photos.length];
          return photo ? [photo] : [];
        });

  const contentOf = ({ slide, ctx }: PlaygroundPage, index: number) =>
    slide.type === "share" ? (
      <StoryFinale ctx={ctx} photos={pickPhotos(slide)} />
    ) : (
      <SlideContent
        slide={slide}
        ctx={ctx}
        quiz={{
          picked: picks.get(index) ?? null,
          onPick: (personId) =>
            setPicks((current) => new Map([...current, [index, personId]])),
        }}
      />
    );

  const share = (page: PlaygroundPage | undefined) => {
    if (!page) {
      return;
    }
    shareFrame({
      slide: page.slide,
      ctx: page.ctx,
      photos: page.slide.type === "share" ? pickPhotos(page.slide) : [],
      dialogTitle: "Playground",
      onShared: noop,
    });
  };

  const slides: PlayerSlide[] = pages.map((page, index) => ({
    key: `${index}-${page.label}`,
    theme: getStoryTheme(isDark),
    // No timer: the playground holds each slide until a swipe.
    isWaiting: true,
    content: contentOf(page, index),
  }));

  if (slides.length === 0) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      {frame}
      <StoryPlayer
        slides={slides}
        onClose={onClose}
        onSlideShown={noop}
        isPaused={isSharing}
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
                  onPress={() => share(page)}
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
    </View>
  );
};
