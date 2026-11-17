import noop from "lodash/noop";
import { useState } from "react";
import { View } from "react-native";
import { StoryText } from "./parts";
import { getPlaygroundPages } from "./playground-pages";
import type { PlaygroundData, PlaygroundPage } from "./playground-pages";
import { SlideContent } from "./slides";
import { getStoryTheme } from "./theme";
import { StoryFinale } from "./story-finale";
import { StoryPlayer } from "./story-player";
import type { PlayerSlide } from "./story-player";
import { StoryFinaleShareButton, StoryShareButton } from "./story-share-button";
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
  data: PlaygroundData;
  isDark: boolean;
  onClose: () => void;
}) => {
  const pages = getPlaygroundPages(deck, data, isDark);
  const { isSharing, share: shareFrame, frame } = useShareFrame();
  const [picks, setPicks] = useState<ReadonlyMap<number, string>>(new Map());

  const contentOf = ({ slide, ctx }: PlaygroundPage, index: number) =>
    slide.type === "share" ? (
      <StoryFinale ctx={ctx} />
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
      dialogTitle: "Playground",
      onShared: noop,
    });
  };

  const slides: PlayerSlide[] = pages.map((page, index) => ({
    key: `${index}-${page.label}`,
    theme: getStoryTheme(isDark),
    // No timer: the playground holds each slide until a tap.
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
          return (
            <View style={{ gap: 8 }} pointerEvents="box-none">
              <StoryText kind="label" theme={theme} tone="muted">
                {page?.label ?? "No slides"}
              </StoryText>
              {page?.slide.type === "share" ? (
                <StoryFinaleShareButton
                  disabled={isSharing}
                  onPress={() => share(page)}
                />
              ) : (
                <View pointerEvents="box-none" style={{ flexDirection: "row" }}>
                  <StoryShareButton
                    theme={theme}
                    disabled={isSharing}
                    onPress={() => share(page)}
                  />
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
};
