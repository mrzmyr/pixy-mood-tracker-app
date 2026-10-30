import { View } from "react-native";
import { TextReveal } from "@/components/text-reveal";
import { t } from "@/lib/translation";
import { dayRange } from "./format";
import { StoryText } from "./parts";
import { PixyFlightArea } from "./pixy-flight-area";
import type { SlideContext } from "./slides";
import { STORY_PALETTE, STORY_TYPE } from "./theme";

/**
 * First slide of the week story: the sky, a kind welcome that writes
 * itself, and cloud Pixy gliding in to fly below it.
 */
export const StoryIntro = ({ ctx }: { ctx: SlideContext }) => {
  const theme = ctx.isDark ? "night" : "paper";
  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 8 }}>
        <StoryText
          kind="eyebrow"
          theme={theme}
          // Gray reads washed out on the sky: a deep blue of its hue instead.
          style={{ color: ctx.isDark ? "rgba(255,255,255,0.7)" : "#2A4A6B" }}
        >
          {dayRange(ctx.period.start, ctx.period.end)}
        </StoryText>
        <TextReveal
          accessibilityRole="header"
          delay={500}
          style={[STORY_TYPE.title, { color: STORY_PALETTE[theme].text }]}
        >
          {t("recaps_story_cover_title_week")}
        </TextReveal>
      </View>
      <PixyFlightArea style={{ flex: 1, marginTop: 24 }} />
    </View>
  );
};
