import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { View as ViewType } from "react-native";
import { createImageGate } from "./image-gate";
import type { ImageGate } from "./image-gate";
import { ShareFrame } from "./share-frame";
import { shareStoryCard } from "./share-image";
import type { SlideContext } from "./slides";
import type { StorySlide } from "./types";

interface Capture {
  slide: StorySlide;
  ctx: SlideContext;
  gate: ImageGate;
}

/**
 * Share as an image: `share` draws a `ShareFrame` of the slide under the
 * story, captures it once laid out with its images loaded, and opens the
 * share sheet. Render `frame` before the story, so the story covers it.
 * `isSharing` stays on from the tap until the sheet closes.
 */
export const useShareFrame = () => {
  const frameView = useRef<ViewType>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [capture, setCapture] = useState<Capture | null>(null);

  const share = ({
    slide,
    ctx,
    dialogTitle,
    onShared,
  }: {
    slide: StorySlide;
    ctx: SlideContext;
    dialogTitle: string;
    onShared: () => void;
  }) => {
    if (isSharing) {
      return;
    }
    setIsSharing(true);
    const gate = createImageGate(() => {
      void shareStoryCard({
        view: frameView.current,
        dialogTitle,
        onCaptured: () => setCapture(null),
        onDone: () => setIsSharing(false),
        onShared,
      });
    });
    setCapture({ slide, ctx, gate });
  };

  // Under the story: never on screen, only in the capture.
  const frame = capture ? (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { alignItems: "flex-start" }]}
    >
      <ShareFrame
        slide={capture.slide}
        ctx={capture.ctx}
        frameRef={frameView}
        gate={capture.gate}
      />
    </View>
  ) : null;

  return { isSharing, share, frame };
};
