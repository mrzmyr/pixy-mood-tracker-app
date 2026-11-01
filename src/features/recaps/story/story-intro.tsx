import { View } from "react-native";
import { TextReveal } from "@/components/text-reveal";
import { getTextRevealDuration } from "@/components/text-reveal-parts";
import { t } from "@/lib/translation";
import { dayRange } from "./format";
import { StoryText } from "./parts";
import { SkyFlightZone } from "@/components/sky-flight-zone";
import type { SlideContext } from "./slides";
import { STORY_PALETTE, STORY_TYPE } from "./theme";

/**
 * First slide of the week story: the sky, a kind welcome that writes
 * itself, and free sky below it for cloud Pixy.
 */
export const StoryIntro = ({ ctx }: { ctx: SlideContext }) => {
  const theme = ctx.isDark ? "night" : "paper";
  const lines = t("recaps_story_cover_title_week").split("\n");
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
        {/* One sentence per line, the second after the first. */}
        <View>
          {lines.map((line, index) => (
            <TextReveal
              key={line}
              accessibilityRole={index === 0 ? "header" : "text"}
              delay={
                500 +
                lines
                  .slice(0, index)
                  .reduce((sum, done) => sum + getTextRevealDuration(done), 0)
              }
              style={[STORY_TYPE.title, { color: STORY_PALETTE[theme].text }]}
            >
              {line}
            </TextReveal>
          ))}
        </View>
      </View>
      <SkyFlightZone style={{ flex: 1, marginTop: 24 }} />
    </View>
  );
};
