import dayjs from "dayjs";
import { use, useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { RADIUS } from "@/constants/radius";
import type { Person } from "@/features/people";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import { RingedAvatar } from "../components/ringed-avatar";
import { THRESHOLDS } from "../thresholds";
import type { DateKey } from "../types";
import { Reveal, RevealText, SlideCard, SlideHeader, StoryText } from "./parts";
import { StoryPressContext } from "./press-context";
import type { SlideContext } from "./slides";
import {
  getStoryTheme,
  STORY_BLOCK_GAP,
  STORY_PALETTE,
  STORY_SCREEN_PADDING,
  titleRevealEnd,
} from "./theme";
import type { StoryTheme } from "./theme";
import type { NewPeopleSlide } from "./types";

/** Time between two faces with few people. Slow on purpose. */
const FACE_STEP_MS = 700;
/** All faces arrive within this time, however many there are. */
const FACES_MS = 3600;
/** Up to this many people, names show under the faces. */
const NAMED_MAX = 5;
/** Width of the name shown while a face is held. */
const NAME_TAG_WIDTH = 160;

/** Faces shrink as the count grows, so everyone fits on one slide. */
const faceSize = (count: number) => {
  if (count === 1) {
    return 112;
  }
  if (count <= NAMED_MAX) {
    return 64;
  }
  return count <= 20 ? 44 : 32;
};

/**
 * Warm closing lines. One per month, in turn, so stories of months in a
 * row never repeat. Every line fits one or many people and says nothing
 * about how the days felt.
 */
const LINES: TranslationKey[] = [
  "recaps_story_new_people_line_1",
  "recaps_story_new_people_line_2",
  "recaps_story_new_people_line_3",
  "recaps_story_new_people_line_4",
  "recaps_story_new_people_line_5",
  "recaps_story_new_people_line_6",
  "recaps_story_new_people_line_7",
  "recaps_story_new_people_line_8",
  "recaps_story_new_people_line_9",
  "recaps_story_new_people_line_10",
  "recaps_story_new_people_line_11",
  "recaps_story_new_people_line_12",
];

/** Line of the month: the same month always gets the same line. */
const newPeopleLine = (periodStart: DateKey): TranslationKey => {
  const date = dayjs(periodStart);
  const index = (date.year() * 12 + date.month()) % LINES.length;
  return LINES[index] ?? LINES[0];
};

type Align = "left" | "center" | "right";

const TAG_LEFT = { left: 0, center: 0.5, right: 1 } as const;
const TAG_ITEMS = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
} as const;

/** Name tag above a held face, kept inside the screen at row ends. */
const NameTag = ({
  name,
  size,
  align,
  theme,
}: {
  name: string;
  size: number;
  align: Align;
  theme: StoryTheme;
}) => {
  const palette = STORY_PALETTE[theme];
  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      pointerEvents="none"
      style={{
        position: "absolute",
        bottom: size + 6,
        left: (size - NAME_TAG_WIDTH) * TAG_LEFT[align],
        width: NAME_TAG_WIDTH,
        alignItems: TAG_ITEMS[align],
      }}
    >
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: RADIUS.full,
          backgroundColor: palette.text,
        }}
      >
        <StoryText
          kind="label"
          theme={theme}
          numberOfLines={1}
          style={{ color: palette.background }}
        >
          {name}
        </StoryText>
      </View>
    </Animated.View>
  );
};

/**
 * One face. A tap moves the story like anywhere else. Press and hold
 * pauses the story; without names under the faces, it also shows the name.
 */
const Face = ({
  person,
  size,
  at,
  align,
  isNamed,
  theme,
}: {
  person: Person;
  size: number;
  at: number;
  align: Align;
  isNamed: boolean;
  theme: StoryTheme;
}) => {
  const press = use(StoryPressContext);
  const [isHeld, setIsHeld] = useState(false);
  return (
    <Reveal at={at} style={{ zIndex: isHeld ? 1 : 0 }}>
      <Pressable
        accessibilityRole="image"
        accessibilityLabel={person.name}
        onPress={(event) => press?.onPress(event)}
        onLongPress={() => {
          setIsHeld(true);
          press?.setIsHolding(true);
        }}
        delayLongPress={200}
        onPressOut={() => {
          setIsHeld(false);
          press?.setIsHolding(false);
        }}
        style={{ alignItems: "center", gap: 8 }}
      >
        <RingedAvatar person={person} size={size} />
        {isNamed && (
          <StoryText
            kind="label"
            theme={theme}
            numberOfLines={1}
            style={{ maxWidth: size + 24, fontSize: size > 64 ? 17 : 13 }}
          >
            {person.name}
          </StoryText>
        )}
        {isHeld && !isNamed && (
          <NameTag name={person.name} size={size} align={align} theme={theme} />
        )}
      </Pressable>
    </Reveal>
  );
};

/**
 * People connected for the first time this month: the count, then every
 * face, one after another in the order they arrived. Faces shrink as the
 * count grows. Up to 5 people show names; with more, holding a face shows
 * its name. A warm line closes the slide.
 */
export const NewPeople = ({
  slide,
  ctx,
}: {
  slide: NewPeopleSlide;
  ctx: SlideContext;
}) => {
  const { width: screen } = useWindowDimensions();
  const theme = getStoryTheme(ctx.isDark);
  const people = slide.people.flatMap(({ personId }) => {
    const person = ctx.people.get(personId);
    return person ? [person] : [];
  });
  if (people.length === 0) {
    return null;
  }
  const shown = people.slice(0, THRESHOLDS.storyNewPeopleMaxFaces);
  const more = people.length - shown.length;
  const size = faceSize(shown.length);
  const isNamed = shown.length <= NAMED_MAX;
  const gap = isNamed ? 16 : 6;
  // The ring adds 1 pt per side. The grid gets the exact row width, so
  // rows break where `alignAt` expects.
  const outer = size + 2;
  const perRow = Math.max(
    1,
    Math.floor((screen - 2 * STORY_SCREEN_PADDING - 1 + gap) / (outer + gap))
  );
  const rowWidth = perRow * outer + (perRow - 1) * gap;
  const alignAt = (index: number): Align => {
    const column = index % perRow;
    if (column === 0) {
      return "left";
    }
    return column === perRow - 1 ? "right" : "center";
  };
  const title = t("recaps_story_new_people_title");
  const start = titleRevealEnd(title);
  const step = Math.min(FACE_STEP_MS, FACES_MS / shown.length);
  const facesEnd = start + shown.length * step;
  return (
    <>
      <SlideHeader
        theme={theme}
        lead={
          <StoryText kind="number" theme={theme}>
            {people.length}
          </StoryText>
        }
        title={title}
      />
      <SlideCard theme={theme} style={{ gap: STORY_BLOCK_GAP }}>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap,
            width: shown.length === 1 ? undefined : rowWidth,
            justifyContent: shown.length === 1 ? "center" : "flex-start",
          }}
        >
          {shown.map((person, index) => (
            <Face
              key={person.id}
              person={person}
              size={size}
              at={start + index * step}
              align={alignAt(index)}
              isNamed={isNamed}
              theme={theme}
            />
          ))}
        </View>
        {more > 0 && (
          <RevealText
            text={t("recaps_story_new_people_more", { count: more })}
            at={facesEnd}
            kind="label"
            theme={theme}
            tone="muted"
          />
        )}
        <RevealText
          text={t(newPeopleLine(ctx.period.start))}
          at={facesEnd + (more > 0 ? 600 : 300)}
          kind="body"
          theme={theme}
        />
      </SlideCard>
    </>
  );
};
