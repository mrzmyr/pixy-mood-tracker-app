import { createContext, use, useState } from "react";
import { Pressable, View } from "react-native";
import type { GestureResponderEvent } from "react-native";
import Check from "lucide-react-native/icons/check";
import { RADIUS } from "@/constants/radius";
import { t } from "@/lib/translation";
import { RingedAvatar } from "../components/ringed-avatar";
import { monthName } from "./format";
import { SlideHeader, StoryText, TagDot } from "./parts";
import type { QuizModule, QuizSlide, QuizStatement } from "./quiz";
import type { SlideContext } from "./slides";
import { STORY_PALETTE } from "./theme";
import type { StoryTheme } from "./theme";

/** What the user answered. `picks`: statement indexes or the tapped id. */
export interface QuizResult {
  isCorrect: boolean;
  picks: string[];
}

const RIGHT = "#059669";

/** Theme of the quiz slide: `paper`, or `night` in dark mode. */
const QuizTheme = createContext<StoryTheme>("paper");

const useQuizTheme = () => {
  const theme = use(QuizTheme);
  return { theme, palette: STORY_PALETTE[theme] };
};

/** Card look after the answer: green for right, struck for made up. */
const cardColors = (
  state: "idle" | "picked" | "right" | "made-up",
  theme: StoryTheme
) => {
  const palette = STORY_PALETTE[theme];
  if (state === "right") {
    return { background: RIGHT, text: "#FFFFFF", border: RIGHT };
  }
  if (state === "made-up") {
    return {
      background: palette.background,
      text: palette.muted,
      border: theme === "paper" ? "#D4D4D8" : "#3F3F46",
    };
  }
  return {
    background: state === "picked" ? palette.background : palette.surface,
    text: palette.text,
    border: state === "picked" ? palette.text : palette.surface,
  };
};

const QuizCard = ({
  icon,
  title,
  subtitle,
  count,
  state,
  onPress,
  testID,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Days, top right in place of `subtitle`, which screen readers still hear. */
  count?: number;
  state: "idle" | "picked" | "right" | "made-up";
  onPress?: (event: GestureResponderEvent) => void;
  testID: string;
}) => {
  const { theme, palette } = useQuizTheme();
  const colors = cardColors(state, theme);
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
        // oxlint-disable-next-line pixy-standards/radius-token -- story artwork, drawn at story scale
        borderRadius: 18,
        borderCurve: "continuous",
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
        {count !== undefined && (
          <StoryText
            kind="title"
            theme={theme}
            testID={`${testID}-count`}
            style={{
              fontSize: 24,
              lineHeight: 28,
              fontWeight: "600",
              fontVariant: ["tabular-nums"],
              color: colors.text,
            }}
          >
            {count}
          </StoryText>
        )}
        {state === "made-up" && (
          <StoryText
            kind="eyebrow"
            theme={theme}
            tone="muted"
            style={{ fontSize: 12 }}
          >
            {t("recaps_story_quiz_made_up")}
          </StoryText>
        )}
      </View>
      <StoryText
        kind="label"
        theme={theme}
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
      {subtitle !== undefined && count === undefined && (
        <StoryText
          kind="label"
          theme={theme}
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

const IconCircle = ({ children }: { children: React.ReactNode }) => {
  const { palette } = useQuizTheme();
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: RADIUS.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.background,
      }}
    >
      {children}
    </View>
  );
};

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

const Reveal = ({ children }: { children: string }) => {
  const { theme } = useQuizTheme();
  return (
    <StoryText kind="body" theme={theme} style={{ marginTop: 16 }}>
      {children}
    </StoryText>
  );
};

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
/** "Your September" or "Your week" for a mixed quiz, else people or tags. */
const getQuizEyebrow = (slide: { module: QuizModule }, ctx: SlideContext) => {
  if (slide.module === "people") {
    return t("recaps_story_quiz_eyebrow_people");
  }
  if (slide.module === "tags") {
    return t("recaps_story_quiz_eyebrow_tags");
  }
  return ctx.period.kind === "week"
    ? t("recaps_story_quiz_eyebrow_mix_week")
    : t("recaps_story_quiz_eyebrow_mix", {
        month: monthName(ctx.period.start),
      });
};

const Truths = ({
  slide,
  ctx,
  result,
  onAnswer,
}: {
  slide: Extract<QuizSlide, { quiz: "truths" }>;
  ctx: SlideContext;
  result: QuizResult | null;
  onAnswer: (result: QuizResult) => void;
}) => {
  const { theme, palette } = useQuizTheme();
  const [picks, setPicks] = useState<ReadonlySet<string>>(new Set());
  const isDone = result !== null;
  const madeUp = slide.statements.find((statement) => !statement.isTrue);
  const eyebrow = getQuizEyebrow(slide, ctx);
  const shownPicks = result ? new Set(result.picks) : picks;
  return (
    <>
      <SlideHeader
        theme={theme}
        eyebrow={eyebrow}
        title={t(TITLES[slide.module])}
      />
      <StoryText
        kind="body"
        theme={theme}
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
          onPress={() => {
            const chosen = [...picks];
            const isCorrect = slide.statements.every(
              (statement, index) =>
                statement.isTrue === picks.has(String(index))
            );
            onAnswer({ isCorrect, picks: chosen });
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
          <Check width={18} height={18} color={palette.background} />
          <StoryText
            kind="label"
            theme={theme === "paper" ? "night" : "paper"}
            style={{ fontSize: 16 }}
          >
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
  onAnswer: (result: QuizResult) => void;
}) => {
  const { theme } = useQuizTheme();
  const ids = slide.quiz === "people" ? slide.personIds : slide.tagIds;
  const picked = new Set(result?.picks);
  const nameOf = (id: string) =>
    slide.quiz === "people"
      ? (ctx.people.get(id)?.name ?? "")
      : (ctx.tags.get(id)?.title ?? "");
  return (
    <>
      <SlideHeader
        theme={theme}
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
              subtitle={
                result
                  ? t(
                      slide.quiz === "people"
                        ? "recaps_story_people_days"
                        : "recaps_story_days",
                      { count: slide.days[id] ?? 0 }
                    )
                  : undefined
              }
              count={result ? (slide.days[id] ?? 0) : undefined}
              state={state}
              testID={`recap-story-quiz-tile-${id}`}
              onPress={
                result
                  ? undefined
                  : () =>
                      onAnswer({ isCorrect: id === slide.answer, picks: [id] })
              }
            />
          );
        })}
      </Grid>
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
  onAnswer: (result: QuizResult) => void;
}) => (
  <QuizTheme value={ctx.isDark ? "night" : "paper"}>
    {slide.quiz === "truths" ? (
      <Truths slide={slide} ctx={ctx} result={result} onAnswer={onAnswer} />
    ) : (
      <Guess slide={slide} ctx={ctx} result={result} onAnswer={onAnswer} />
    )}
  </QuizTheme>
);
