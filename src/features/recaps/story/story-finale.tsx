import { useEffect, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import type { View as ViewType } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { SkyPixy } from "@/components/sky-pixy";
import type { FlightZone } from "@/components/sky-pixy";
import { usePixyIdle } from "@/features/logger";
import { t } from "@/lib/translation";
import { monthName } from "./format";
import { StoryText } from "./parts";
import { ShareCard } from "./share-card";
import { StoryShareButton } from "./story-share-button";
import type { SlideContext } from "./slides";
import type { StoryPhoto } from "./types";

/** Pixy waits for the slide to settle, then glides in this long. */
const ARRIVAL_DELAY_MS = 400;
const ARRIVAL_MS = 2400;

/**
 * Last slide, on the sky: a quiet "That was your week", the card to send
 * on, and a wide share button. Cloud Pixy flies in the free sky above and
 * never crosses the card. It glides in from beyond the screen edge. Reduced
 * motion: no Pixy.
 */
export const StoryFinale = ({
  ctx,
  photos,
  cardRef,
  onShuffle,
  isSharing,
  onShare,
}: {
  ctx: SlideContext;
  photos: StoryPhoto[];
  cardRef: React.Ref<ViewType>;
  onShuffle: (() => void) | null;
  isSharing: boolean;
  onShare: () => void;
}) => {
  const theme = ctx.isDark ? "night" : "paper";
  const isReducedMotion = useReducedMotion();
  const boost = useSharedValue(0);
  const idle = usePixyIdle({ isEnabled: true, isReducedMotion });
  const root = useRef<View>(null);
  const sky = useRef<View>(null);
  const [zone, setZone] = useState<FlightZone | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  // Pixy glides in from beyond the right edge, then flies its loop.
  const arrival = useSharedValue(1);
  useEffect(() => {
    arrival.set(
      withDelay(
        ARRIVAL_DELAY_MS,
        withTiming(0, {
          duration: ARRIVAL_MS,
          easing: Easing.out(Easing.cubic),
        })
      )
    );
  }, [arrival]);
  const arrivalStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: arrival.get() * screenWidth }],
  }));

  // Pixy's zone is in the root's coordinates, where its layer sits.
  const measure = () => {
    root.current?.measureInWindow((rootX, rootY) => {
      sky.current?.measureInWindow((x, y, width, height) => {
        setZone({ x: x - rootX, y: y - rootY, width, height });
      });
    });
  };

  return (
    <View ref={root} style={{ flex: 1 }} onLayout={measure}>
      <View ref={sky} style={{ flex: 1 }} onLayout={measure} />
      <View style={{ gap: 12 }}>
        <StoryText
          kind="eyebrow"
          theme={theme}
          tone="muted"
          style={{ textAlign: "center" }}
        >
          {ctx.period.kind === "week"
            ? t("recaps_story_finale_eyebrow_week")
            : t("recaps_story_finale_eyebrow", {
                month: monthName(ctx.period.start),
              })}
        </StoryText>
        <ShareCard
          ctx={ctx}
          photos={photos}
          cardRef={cardRef}
          onShuffle={onShuffle}
        />
        <StoryShareButton
          theme={theme}
          disabled={isSharing}
          onPress={onShare}
          isWide
        />
      </View>
      <View style={{ height: 8 }} />
      {!isReducedMotion && (
        <Animated.View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFill, arrivalStyle]}
        >
          <SkyPixy boost={boost} zone={zone} isBlinking={idle.isBlinking} />
        </Animated.View>
      )}
    </View>
  );
};
