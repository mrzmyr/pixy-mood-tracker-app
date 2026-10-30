import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { View as ViewType } from "react-native";
import { useReducedMotion, useSharedValue } from "react-native-reanimated";
import { SkyPixy } from "@/components/sky-pixy";
import type { FlightZone } from "@/components/sky-pixy";
import { usePixyIdle } from "@/features/logger";
import { t } from "@/lib/translation";
import { monthName } from "./format";
import { StoryText } from "./parts";
import { ShareCard } from "./share-card";
import type { SlideContext } from "./slides";
import type { StoryPhoto } from "./types";

/**
 * Last slide, on the sky: thanks for looking back, then the card to send
 * on. Cloud Pixy flies in the free sky between them and never crosses
 * text or the card. Reduced motion: no Pixy.
 */
export const StoryFinale = ({
  ctx,
  photos,
  cardRef,
  onShuffle,
}: {
  ctx: SlideContext;
  photos: StoryPhoto[];
  cardRef: React.Ref<ViewType>;
  onShuffle: (() => void) | null;
}) => {
  const theme = ctx.isDark ? "night" : "paper";
  const isReducedMotion = useReducedMotion();
  const boost = useSharedValue(0);
  const idle = usePixyIdle({ isEnabled: true, isReducedMotion });
  const root = useRef<View>(null);
  const sky = useRef<View>(null);
  const [zone, setZone] = useState<FlightZone | null>(null);

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
      <View style={{ alignItems: "center", gap: 8, paddingHorizontal: 8 }}>
        <StoryText kind="eyebrow" theme={theme} tone="muted">
          {ctx.period.kind === "week"
            ? t("recaps_story_finale_eyebrow_week")
            : t("recaps_story_finale_eyebrow", {
                month: monthName(ctx.period.start),
              })}
        </StoryText>
        <StoryText kind="title" theme={theme} style={{ textAlign: "center" }}>
          {t("recaps_story_finale_title")}
        </StoryText>
      </View>
      <View ref={sky} style={{ flex: 1 }} onLayout={measure} />
      <ShareCard
        ctx={ctx}
        photos={photos}
        cardRef={cardRef}
        onShuffle={onShuffle}
      />
      {!isReducedMotion && (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <SkyPixy boost={boost} zone={zone} isBlinking={idle.isBlinking} />
        </View>
      )}
    </View>
  );
};
