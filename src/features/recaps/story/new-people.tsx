import dayjs from "dayjs";
import { View } from "react-native";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import { RingedAvatar } from "../components/ringed-avatar";
import type { DateKey } from "../types";
import { shortDay } from "./format";
import { Reveal, RevealText, SlideCard, SlideHeader } from "./parts";
import type { SlideContext } from "./slides";
import {
  getStoryTheme,
  revealTextMs,
  STORY_BLOCK_GAP,
  STORY_PALETTE,
  titleRevealEnd,
} from "./theme";
import { THRESHOLDS } from "../thresholds";
import type { NewPeopleSlide } from "./types";

/** Time between two people: one arrives, then the next. Slow on purpose. */
const PERSON_STEP_MS = 900;
/** Avatar size of one arrival. */
const AVATAR = 52;
/** Space between two arrivals, bridged by the thread. */
const ROW_GAP = 18;

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

/**
 * People connected for the first time this month. They arrive one at a
 * time, in the order they joined: avatar, name, first day. A thin thread
 * links each arrival to the one before. A warm line closes the slide.
 */
export const NewPeople = ({
  slide,
  ctx,
}: {
  slide: NewPeopleSlide;
  ctx: SlideContext;
}) => {
  const theme = getStoryTheme(ctx.isDark);
  const palette = STORY_PALETTE[theme];
  const rows = slide.people.flatMap((row) => {
    const person = ctx.people.get(row.personId);
    return person ? [{ ...row, person }] : [];
  });
  if (rows.length === 0) {
    return null;
  }
  const shown = rows.slice(0, THRESHOLDS.storyNewPeopleMaxRows);
  const more = rows.length - shown.length;
  const title = t("recaps_story_new_people_title");
  const start = titleRevealEnd(title);
  const personAt = (index: number) => start + index * PERSON_STEP_MS;
  const moreText = t("recaps_story_new_people_more", { count: more });
  const line = t(newPeopleLine(ctx.period.start));
  const lineAt = personAt(shown.length) + (more > 0 ? 300 : 0);
  return (
    <>
      <SlideHeader theme={theme} title={title} />
      <SlideCard theme={theme} style={{ gap: STORY_BLOCK_GAP }}>
        <View style={{ gap: ROW_GAP }}>
          {shown.map((row, index) => {
            const since = t("recaps_story_new_people_since", {
              date: shortDay(row.firstDate),
            });
            const days = t("recaps_story_days", { count: row.days });
            const at = personAt(index);
            return (
              <View
                key={row.personId}
                accessible
                accessibilityLabel={`${row.person.name}, ${since}, ${days}`}
                style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
              >
                <View>
                  {index > 0 && (
                    // Thread from the arrival before, drawn just ahead of this one.
                    <Reveal
                      at={at - 250}
                      style={{
                        position: "absolute",
                        left: AVATAR / 2,
                        bottom: AVATAR,
                        width: 1,
                        height: ROW_GAP,
                        backgroundColor: palette.muted,
                        opacity: 0.5,
                      }}
                    >
                      {null}
                    </Reveal>
                  )}
                  <Reveal at={at}>
                    <RingedAvatar person={row.person} size={AVATAR} />
                  </Reveal>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <RevealText
                    text={row.person.name}
                    at={at + 150}
                    kind="label"
                    theme={theme}
                    style={{ fontSize: 17, lineHeight: 22 }}
                  />
                  <RevealText
                    text={since}
                    at={at + 150 + revealTextMs(row.person.name)}
                    kind="label"
                    theme={theme}
                    tone="muted"
                  />
                </View>
                <RevealText
                  text={days}
                  at={at + 300 + revealTextMs(row.person.name)}
                  kind="label"
                  theme={theme}
                  tone="muted"
                />
              </View>
            );
          })}
        </View>
        {more > 0 && (
          <RevealText
            text={moreText}
            at={personAt(shown.length)}
            kind="label"
            theme={theme}
            tone="muted"
          />
        )}
        <RevealText text={line} at={lineAt} kind="body" theme={theme} />
      </SlideCard>
    </>
  );
};
