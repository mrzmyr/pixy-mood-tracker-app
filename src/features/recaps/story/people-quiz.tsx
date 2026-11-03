import { useRef, useState } from "react";
import { Pressable, View } from "react-native";
import type { GestureResponderEvent } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { RADIUS } from "@/constants/radius";
import { t } from "@/lib/translation";
import { RingedAvatar } from "../components/ringed-avatar";
import { Reveal, SlideCard, SlideHeader, StoryText } from "./parts";
import type { SlideContext } from "./slides";
import { TapConfetti } from "./tap-confetti";
import { getStoryTheme, STORY_PALETTE, titleRevealEnd } from "./theme";
import type { PeopleQuizSlide } from "./types";

/** Fill of the right answer, with white text on it. */
const RIGHT = "#059669";

/** Answer of a quiz slide: the tapped person, and the tap handler. */
export interface QuizAnswer {
  /** Tapped person, `null` until the user answers. */
  picked: string | null;
  onPick: (personId: string) => void;
}

/** Time between two tiles of the build-up. */
const TILE_STEP_MS = 120;

/**
 * "Who played the biggest role?": one tap on a person. Then every tile
 * shows its connected days and the right one turns green. A right guess
 * bursts confetti where the finger was.
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
                  borderWidth: isWrongPick ? 2 : 1,
                  borderColor: isWrongPick ? palette.text : palette.glassBorder,
                  backgroundColor: isRight ? RIGHT : palette.glass,
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
                      color: isRight ? "#FFFFFF" : palette.text,
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
                        style={isRight ? { color: "#FFFFFF" } : undefined}
                      >
                        {daysText}
                      </StoryText>
                    </Animated.View>
                  )}
                </View>
              </Pressable>
            </Reveal>
          );
        })}
      </SlideCard>
      {isDone && (
        <Animated.View
          entering={FadeIn.duration(400)}
          accessibilityLiveRegion="polite"
          style={{ marginTop: 20 }}
        >
          <StoryText kind="body" theme={theme}>
            {picked === slide.answer
              ? t("recaps_story_quiz_right")
              : t("recaps_story_quiz_wrong", { name: answerName })}
          </StoryText>
        </Animated.View>
      )}
      {burst && <TapConfetti x={burst.x} y={burst.y} />}
    </View>
  );
};
