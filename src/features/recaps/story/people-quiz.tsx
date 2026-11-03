import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import type { GestureResponderEvent } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Check from "lucide-react-native/icons/check";
import X from "lucide-react-native/icons/x";
import { RADIUS } from "@/constants/radius";
import { t } from "@/lib/translation";
import { RingedAvatar } from "../components/ringed-avatar";
import { Reveal, SlideCard, SlideHeader, StoryText } from "./parts";
import type { SlideContext } from "./slides";
import { TapConfetti } from "./tap-confetti";
import { getStoryTheme, STORY_PALETTE, titleRevealEnd } from "./theme";
import type { PeopleQuizSlide, QuizInsight } from "./types";

/**
 * The right tile turns solid white with dark text in both themes: the only
 * opaque surface on the sky, so it reads at once over any cloud. Its check
 * badge carries the "right" color.
 */
const ANSWER = { fill: "#FFFFFF", text: "#0A0A0A", muted: "#52525B" };
const RIGHT_BADGE = "#059669";
/** Opacity of the other tiles once the answer shows. */
const DIMMED = 0.5;
const BADGE = 22;

/** Answer of a quiz slide: the tapped person, and the tap handler. */
export interface QuizAnswer {
  /** Tapped person, `null` until the user answers. */
  picked: string | null;
  onPick: (personId: string) => void;
}

/** Time between two tiles of the build-up. */
const TILE_STEP_MS = 120;

/** Springs the right tile up and back, and fades the tiles out of focus. */
const TileMotion = ({
  isRight,
  isDimmed,
  children,
}: {
  isRight: boolean;
  isDimmed: boolean;
  children: ReactNode;
}) => {
  const isReducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (isRight && !isReducedMotion) {
      scale.set(
        withSequence(
          withSpring(1.06, { damping: 12, stiffness: 400 }),
          withSpring(1, { damping: 10, stiffness: 220 })
        )
      );
    }
  }, [isRight, isReducedMotion, scale]);
  useEffect(() => {
    opacity.set(withTiming(isDimmed ? DIMMED : 1, { duration: 300 }));
  }, [isDimmed, opacity]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
};

/** Round mark in the tile corner: check on the answer, cross on a wrong pick. */
const Badge = ({ isRight, color }: { isRight: boolean; color: string }) => {
  const Icon = isRight ? Check : X;
  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        width: BADGE,
        height: BADGE,
        borderRadius: RADIUS.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isRight ? RIGHT_BADGE : color,
      }}
    >
      <Icon size={14} strokeWidth={3} color="#FFFFFF" />
    </Animated.View>
  );
};

/** One line on what came up on the answer's connected days. */
const insightText = (insight: QuizInsight, name: string, ctx: SlideContext) => {
  if (insight.kind === "place") {
    return t("recaps_story_quiz_insight_place", {
      count: insight.days,
      name,
      place: insight.city,
    });
  }
  const tag = ctx.tags.get(insight.tagId)?.title;
  return tag
    ? t("recaps_story_quiz_insight_tag", { count: insight.days, name, tag })
    : null;
};

/**
 * "Who played the biggest role?": one tap on a person. Then every tile
 * shows its connected days, the right one turns solid white with a check,
 * and the others fade. A line names what came up on the right person's
 * days. A right guess bursts confetti where the finger was.
 */
export const PeopleQuiz = ({
  slide,
  ctx,
  quiz,
}: {
  slide: PeopleQuizSlide;
  ctx: SlideContext;
  quiz: QuizAnswer;
}) => {
  const { picked } = quiz;
  const theme = getStoryTheme(ctx.isDark);
  const palette = STORY_PALETTE[theme];
  const isReducedMotion = useReducedMotion();
  const root = useRef<View>(null);
  const [burst, setBurst] = useState<{ x: number; y: number } | null>(null);
  const isDone = picked !== null;
  const title = t("recaps_story_quiz_title");
  const tilesAt = titleRevealEnd(title);
  const answerName = ctx.people.get(slide.answer)?.name ?? "";
  const insight = slide.insight
    ? insightText(slide.insight, answerName, ctx)
    : null;

  const pick = (personId: string, event: GestureResponderEvent) => {
    if (isDone) {
      return;
    }
    // `pageX`, not `locationX`: `locationX` counts from the touched child.
    const { pageX, pageY } = event.nativeEvent;
    if (personId === slide.answer && !isReducedMotion) {
      root.current?.measureInWindow((left, top) =>
        setBurst({ x: pageX - left, y: pageY - top })
      );
    }
    quiz.onPick(personId);
  };

  return (
    <View ref={root}>
      <SlideHeader theme={theme} title={title} />
      <SlideCard
        theme={theme}
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          rowGap: 12,
        }}
      >
        {slide.people.map(({ personId, days }, index) => {
          const person = ctx.people.get(personId);
          if (!person) {
            return null;
          }
          const isRight = isDone && personId === slide.answer;
          const isWrongPick = picked === personId && !isRight;
          const daysText = t("recaps_story_people_days", { count: days });
          return (
            <Reveal
              key={personId}
              at={tilesAt + index * TILE_STEP_MS}
              style={{ width: "48%" }}
            >
              <TileMotion
                isRight={isRight}
                isDimmed={isDone && !isRight && !isWrongPick}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isDone ? `${person.name}, ${daysText}` : person.name
                  }
                  accessibilityState={{
                    selected: picked === personId,
                    disabled: isDone,
                  }}
                  disabled={isDone}
                  onPress={(event) => pick(personId, event)}
                  testID={`recap-story-quiz-tile-${index}`}
                  style={({ pressed }) => ({
                    minHeight: 124,
                    padding: 14,
                    gap: 10,
                    borderRadius: RADIUS.lg,
                    borderCurve: "continuous",
                    borderWidth: 1,
                    borderColor: isRight ? ANSWER.fill : palette.glassBorder,
                    backgroundColor: isRight ? ANSWER.fill : palette.glass,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <RingedAvatar person={person} size={44} />
                  <View style={{ marginTop: "auto", gap: 2 }}>
                    <StoryText
                      kind="body"
                      theme={theme}
                      numberOfLines={1}
                      style={{
                        fontWeight: "600",
                        color: isRight ? ANSWER.text : palette.text,
                      }}
                    >
                      {person.name}
                    </StoryText>
                    {isDone && (
                      <Animated.View entering={FadeIn.duration(400)}>
                        <StoryText
                          kind="label"
                          theme={theme}
                          tone="muted"
                          style={isRight ? { color: ANSWER.muted } : undefined}
                        >
                          {daysText}
                        </StoryText>
                      </Animated.View>
                    )}
                  </View>
                  {(isRight || isWrongPick) && (
                    <Badge isRight={isRight} color={palette.muted} />
                  )}
                </Pressable>
              </TileMotion>
            </Reveal>
          );
        })}
      </SlideCard>
      {isDone && (
        <Animated.View
          entering={FadeIn.duration(400)}
          accessibilityLiveRegion="polite"
          style={{ marginTop: 20, gap: 6 }}
        >
          <StoryText kind="body" theme={theme} style={{ fontWeight: "600" }}>
            {picked === slide.answer
              ? t("recaps_story_quiz_right")
              : t("recaps_story_quiz_wrong", { name: answerName })}
          </StoryText>
          {insight && (
            <StoryText kind="body" theme={theme} tone="muted">
              {insight}
            </StoryText>
          )}
        </Animated.View>
      )}
      {burst && <TapConfetti x={burst.x} y={burst.y} />}
    </View>
  );
};
