import { useState } from "react";
import { Pressable, View } from "react-native";
import type { GestureResponderEvent } from "react-native";
import Check from "lucide-react-native/icons/check";
import { RADIUS } from "@/constants/radius";
import { t } from "@/lib/translation";
import { RingedAvatar } from "../components/ringed-avatar";
import type { CelebrationOrigin } from "./celebration";
import { monthName } from "./format";
import { SlideHeader, StoryText, TagDot } from "./parts";
import type { QuizSlide, QuizStatement } from "./quiz";
import type { SlideContext } from "./slides";
import { STORY_PALETTE } from "./theme";

/** What the user answered. `picks`: statement indexes or the tapped id. */
export interface QuizResult {
  isCorrect: boolean;
  picks: string[];
}

const RIGHT = "#059669";
const palette = STORY_PALETTE.paper;

const originOf = (event: GestureResponderEvent): CelebrationOrigin => ({
  x: event.nativeEvent.pageX,
  y: event.nativeEvent.pageY,
});

/** Card look after the answer: green for right, struck for made up. */
const cardColors = (state: "idle" | "picked" | "right" | "made-up") => {
  if (state === "right") {
    return { background: RIGHT, text: "#FFFFFF", border: RIGHT };
  }
  if (state === "made-up") {
    return { background: "#FFFFFF", text: palette.muted, border: "#D4D4D8" };
  }
  return {
    background: state === "picked" ? "#FFFFFF" : palette.surface,
    text: palette.text,
    border: state === "picked" ? palette.text : palette.surface,
  };
};

const QuizCard = ({
  icon,
  title,
  subtitle,
  state,
  onPress,
  testID,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  state: "idle" | "picked" | "right" | "made-up";
  onPress?: (event: GestureResponderEvent) => void;
  testID: string;
}) => {
  const colors = cardColors(state);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: state === "picked", disabled: !onPress }}
      accessibilityLabel={[title, subtitle].filter(Boolean).join(", ")}
      disabled={!onPress}
      onPress={onPress}
      testID={testID}
      style={{
        width: "48%",
        minHeight: 124,
        padding: 14,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: colors.background,
        gap: 4,
      }}
    >
      <View
        style={{
          marginBottom: "auto",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        {icon}
        {state === "made-up" && (
          <StoryText
            kind="eyebrow"
            theme="paper"
            tone="muted"
            style={{ fontSize: 12 }}
          >
            {t("recaps_story_quiz_made_up")}
          </StoryText>
        )}
      </View>
      <StoryText
        kind="label"
        theme="paper"
        numberOfLines={2}
        style={{
          fontSize: 17,
          lineHeight: 20,
          marginTop: 12,
          color: colors.text,
          textDecorationLine: state === "made-up" ? "line-through" : "none",
        }}
      >
        {title}
      </StoryText>
      {subtitle !== undefined && (
        <StoryText
          kind="label"
          theme="paper"
          style={{
            fontWeight: "500",
            color: state === "right" ? "rgba(255,255,255,0.85)" : palette.muted,
          }}
        >
          {subtitle}
        </StoryText>
      )}
    </Pressable>
  );
};

const IconCircle = ({ children }: { children: React.ReactNode }) => (
  <View
    style={{
      width: 40,
      height: 40,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FFFFFF",
    }}
  >
    {children}
  </View>
);

const Grid = ({ children }: { children: React.ReactNode }) => (
  <View
    style={{
      marginTop: 20,
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 10,
    }}
  >
    {children}
  </View>
);

const Reveal = ({ children }: { children: string }) => (
  <StoryText kind="body" theme="paper" style={{ marginTop: 16 }}>
    {children}
  </StoryText>
);

const statementIcon = (statement: QuizStatement, ctx: SlideContext) => {
  if (statement.kind === "person") {
    const person = ctx.people.get(statement.personId);
    return person ? <RingedAvatar person={person} size={40} /> : null;
  }
  const tag = ctx.tags.get(statement.tagId);
  return tag ? (
    <IconCircle>
      <TagDot tag={tag} size={16} />
    </IconCircle>
  ) : null;
};

const statementTitle = (statement: QuizStatement, ctx: SlideContext) =>
  statement.kind === "person"
    ? (ctx.people.get(statement.personId)?.name ?? "")
    : (ctx.tags.get(statement.tagId)?.title ?? "");

const TITLES = {
  mix: "recaps_story_quiz_title_mix",
  people: "recaps_story_quiz_title_people",
  tags: "recaps_story_quiz_title_tags",
} as const;

/** "Which ones are true?": tap all true cards, then Check. */
const Truths = ({
  slide,
  ctx,
  result,
  onAnswer,
}: {
  slide: Extract<QuizSlide, { quiz: "truths" }>;
  ctx: SlideContext;
  result: QuizResult | null;
  onAnswer: (result: QuizResult, origin: CelebrationOrigin) => void;
}) => {
  const [picks, setPicks] = useState<ReadonlySet<string>>(new Set());
  const isDone = result !== null;
  const madeUp = slide.statements.find((statement) => !statement.isTrue);
  const eyebrow =
    slide.module === "mix"
      ? t("recaps_story_quiz_eyebrow_mix", {
          month: monthName(ctx.period.start),
        })
      : t(
          slide.module === "people"
            ? "recaps_story_quiz_eyebrow_people"
            : "recaps_story_quiz_eyebrow_tags"
        );
  const shownPicks = result ? new Set(result.picks) : picks;
  return (
    <>
      <SlideHeader
        theme="paper"
        eyebrow={eyebrow}
        title={t(TITLES[slide.module])}
      />
      <StoryText
        kind="body"
        theme="paper"
        tone="muted"
        style={{ marginTop: 6 }}
      >
        {t("recaps_story_quiz_truths_hint")}
      </StoryText>
      <Grid>
        {slide.statements.map((statement, index) => {
          const key = String(index);
          const id =
            statement.kind === "person" ? statement.personId : statement.tagId;
          let state: "idle" | "picked" | "right" | "made-up" = shownPicks.has(
            key
          )
            ? "picked"
            : "idle";
          if (isDone) {
            state = statement.isTrue ? "right" : "made-up";
          }
          return (
            <QuizCard
              key={id}
              icon={statementIcon(statement, ctx)}
              title={statementTitle(statement, ctx)}
              subtitle={t(
                statement.kind === "person"
                  ? "recaps_story_people_days"
                  : "recaps_story_days",
                { count: statement.days }
              )}
              state={state}
              testID={`recap-story-quiz-card-${index}`}
              onPress={
                isDone
                  ? undefined
                  : () =>
                      setPicks((current) => {
                        const next = new Set(current);
                        if (next.has(key)) {
                          next.delete(key);
                        } else {
                          next.add(key);
                        }
                        return next;
                      })
              }
            />
          );
        })}
      </Grid>
      {isDone && madeUp ? (
        <Reveal>
          {t("recaps_story_quiz_reveal_truths", {
            name: statementTitle(madeUp, ctx),
            actual: slide.actual,
            shown: madeUp.days,
          })}
        </Reveal>
      ) : (
        <Pressable
          accessibilityRole="button"
          testID="recap-story-quiz-check"
          onPress={(event) => {
            const chosen = [...picks];
            const isCorrect = slide.statements.every(
              (statement, index) =>
                statement.isTrue === picks.has(String(index))
            );
            onAnswer({ isCorrect, picks: chosen }, originOf(event));
          }}
          style={{
            marginTop: 16,
            minHeight: 48,
            borderRadius: RADIUS.full,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            backgroundColor: palette.text,
          }}
        >
          <Check width={18} height={18} color="#FFFFFF" />
          <StoryText kind="label" theme="night" style={{ fontSize: 16 }}>
            {t("recaps_story_quiz_check")}
          </StoryText>
        </Pressable>
      )}
    </>
  );
};

/** One tap: the most connected person or the most used tag. */
const Guess = ({
  slide,
  ctx,
  result,
  onAnswer,
}: {
  slide: Exclude<QuizSlide, { quiz: "truths" }>;
  ctx: SlideContext;
  result: QuizResult | null;
  onAnswer: (result: QuizResult, origin: CelebrationOrigin) => void;
}) => {
  const ids = slide.quiz === "people" ? slide.personIds : slide.tagIds;
  const picked = new Set(result?.picks);
  const nameOf = (id: string) =>
    slide.quiz === "people"
      ? (ctx.people.get(id)?.name ?? "")
      : (ctx.tags.get(id)?.title ?? "");
  return (
    <>
      <SlideHeader
        theme="paper"
        eyebrow={t("recaps_story_quiz_eyebrow_guess")}
        title={t(
          slide.quiz === "people"
            ? "recaps_story_quiz_title_people_most"
            : "recaps_story_quiz_title_tags_most"
        )}
      />
      <Grid>
        {ids.map((id) => {
          const person =
            slide.quiz === "people" ? ctx.people.get(id) : undefined;
          const tag = slide.quiz === "tags" ? ctx.tags.get(id) : undefined;
          let state: "idle" | "picked" | "right" = "idle";
          if (result && id === slide.answer) {
            state = "right";
          } else if (picked.has(id)) {
            state = "picked";
          }
          return (
            <QuizCard
              key={id}
              icon={
                person ? (
                  <RingedAvatar person={person} size={48} />
                ) : (
                  tag && (
                    <IconCircle>
                      <TagDot tag={tag} size={16} />
                    </IconCircle>
                  )
                )
              }
              title={nameOf(id)}
              state={state}
              testID={`recap-story-quiz-tile-${id}`}
              onPress={
                result
                  ? undefined
                  : (event) =>
                      onAnswer(
                        { isCorrect: id === slide.answer, picks: [id] },
                        originOf(event)
                      )
              }
            />
          );
        })}
      </Grid>
      {result && (
        <Reveal>
          {t(
            slide.quiz === "people"
              ? "recaps_story_quiz_reveal_people"
              : "recaps_story_quiz_reveal_tags",
            {
              name: nameOf(slide.answer),
              count: slide.days,
              runnerUp: nameOf(slide.runnerUp.id),
              days: slide.runnerUp.days,
            }
          )}
        </Reveal>
      )}
    </>
  );
};

/** Quiz slide content. The slide waits until the user answers. */
export const QuizContent = ({
  slide,
  ctx,
  result,
  onAnswer,
}: {
  slide: QuizSlide;
  ctx: SlideContext;
  result: QuizResult | null;
  onAnswer: (result: QuizResult, origin: CelebrationOrigin) => void;
}) =>
  slide.quiz === "truths" ? (
    <Truths slide={slide} ctx={ctx} result={result} onAnswer={onAnswer} />
  ) : (
    <Guess slide={slide} ctx={ctx} result={result} onAnswer={onAnswer} />
  );
