import dayjs from "dayjs";
import { use, useEffect } from "react";
import noop from "lodash/noop";
import { PixelRatio, Pressable, useWindowDimensions, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Plus from "lucide-react-native/icons/plus";
import Button from "@/components/button";
import { SkyFlightZone } from "@/components/sky-flight-zone";
import { RADIUS } from "@/constants/radius";
import {
  EmotionIndicator,
  EMOTIONS,
  SleepQualityMeter,
} from "@/features/logger";
import { t, tDynamic } from "@/lib/translation";
import { RingedAvatar } from "../components/ringed-avatar";
import type { Person } from "@/features/people";
import type { Tag } from "@/features/tags";
import type { DateKey } from "../types";
import { monthName } from "./format";
import {
  GlassChip,
  MonthGrid,
  Reveal,
  SlideHeader,
  StoryImage,
  StoryText,
  TagDot,
} from "./parts";
import { StoryPressContext } from "./press-context";
import { itemKey, seenBefore } from "./sleep";
import type { RoughNightsAnswer } from "./sleep";
import type { SlideContext } from "./slides";
import {
  chipInset,
  getStoryTheme,
  STORY_BLOCK_GAP,
  STORY_PALETTE,
  STORY_SELECTED_CHIP,
  STORY_SCREEN_PADDING,
  titleRevealEnd,
} from "./theme";
import type { StoryTheme } from "./theme";
import type {
  RoughNightItem,
  RoughNightSlide,
  RoughNightsAllSlide,
  RoughNightsAskSlide,
  SleepSlide,
} from "./types";

/** Sleep quality of a rough night: bad (1) or very bad (0). */
const ROUGH_MAX = 1;
const GRID_GAP = 6;
const MAX_CELL = 48;
/** Above this many tags, people, emotions, and photos, chips get smaller. */
const DENSE_LOAD = 14;
const CAP = { tags: 6, people: 4, emotions: 6, photos: 3 };

const EMOTION_BY_KEY = new Map(
  EMOTIONS.map((emotion) => [emotion.key, emotion])
);
const GOOD_EMOTIONS = new Set(["very_good", "good"]);

/** Weekday and date of an evening: "Monday evening", "5 Oct". */
const eveningLabels = (date: DateKey) => ({
  weekday: t("recaps_story_rough_evening", {
    weekday: dayjs(date).format("dddd"),
  }),
  date: dayjs(date).format("D MMM"),
});

const meterLabel = (quality: number) =>
  `${t("logger_step_sleep")} ${Math.round(quality) + 1}/5`;

/** Skip and Look side by side, as on the privacy slide: equal weight. */
const AskButtons = ({
  onSkip,
  onLook,
}: {
  onSkip: () => void;
  onLook: () => void;
}) => (
  <View style={{ flexDirection: "row", gap: 12 }}>
    <View style={{ flex: 1 }}>
      <Button type="glass" onPress={onSkip} testID="recap-sleep-skip">
        {t("recaps_story_sleep_skip")}
      </Button>
    </View>
    <View style={{ flex: 1 }}>
      <Button type="primary" onPress={onLook} testID="recap-sleep-look">
        {t("recaps_story_sleep_look")}
      </Button>
    </View>
  </View>
);

// ---------------------------------------------------------------- sleep

/**
 * The month as a calendar of sleep meters, one per morning with sleep.
 * With rough nights to look at, the other nights fade back after the
 * reveal and the slide asks to look closer. The story waits for the answer.
 */
export const SleepCalendar = ({
  slide,
  ctx,
  onLook,
  onSkip,
}: {
  slide: SleepSlide;
  ctx: SlideContext;
  onLook?: () => void;
  onSkip?: () => void;
}) => {
  const theme = getStoryTheme(ctx.isDark);
  const palette = STORY_PALETTE[theme];
  const { width: screen } = useWindowDimensions();
  const inner = screen - 2 * STORY_SCREEN_PADDING;
  const size = Math.min(
    MAX_CELL,
    PixelRatio.roundToNearestPixel((inner - 6 * GRID_GAP) / 7)
  );
  const meterHeight = Math.round(size * 0.62);
  const byDate = new Map(slide.nights.map((night) => [night.date, night]));
  const title = t("recaps_story_sleep_title", {
    month: monthName(ctx.period.start),
  });
  const revealAt = titleRevealEnd(title);
  const revealEnd = revealAt + 31 * 25 + 400;
  const roughCount = slide.nights.filter((n) => n.quality <= ROUGH_MAX).length;
  const isAsking = slide.roughNights.length > 0 && onLook && onSkip;
  const dim = useSharedValue(1);
  useEffect(() => {
    if (isAsking) {
      dim.set(withDelay(revealEnd, withTiming(0.3, { duration: 600 })));
    }
  }, [dim, isAsking, revealEnd]);
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.get() }));

  return (
    <View style={{ flex: 1 }}>
      <SlideHeader theme={theme} title={title} />
      <Reveal at={revealAt} style={{ marginTop: 8 }}>
        <StoryText kind="body" theme={theme} tone="muted">
          {t("recaps_story_sleep_hint")}
        </StoryText>
      </Reveal>
      <View style={{ marginTop: STORY_BLOCK_GAP }}>
        <MonthGrid
          period={ctx.period}
          dayColors={new Map()}
          size={size}
          gap={GRID_GAP}
          empty="transparent"
          weekdayColor={palette.muted}
          revealAt={revealAt}
          revealStepMs={25}
          render={(date) => {
            const night = byDate.get(date);
            const isRough = night !== undefined && night.quality <= ROUGH_MAX;
            const cell = (
              <View
                style={{ width: size, alignItems: "center", gap: 4 }}
                accessible
                accessibilityLabel={
                  night
                    ? `${dayjs(date).format("D MMMM")}, ${meterLabel(night.quality)}`
                    : dayjs(date).format("D MMMM")
                }
              >
                {night ? (
                  <SleepQualityMeter
                    value={night.quality}
                    height={meterHeight}
                  />
                ) : (
                  <View
                    style={{
                      width: meterHeight / 2,
                      height: meterHeight,
                      borderRadius: RADIUS.sm,
                      borderWidth: 1,
                      borderStyle: "dashed",
                      borderColor: palette.glassBorder,
                    }}
                  />
                )}
                <StoryText
                  kind="label"
                  theme={theme}
                  tone="muted"
                  style={{ fontSize: 12, lineHeight: 14, fontWeight: "500" }}
                >
                  {dayjs(date).date()}
                </StoryText>
              </View>
            );
            return isAsking && !isRough ? (
              <Animated.View style={dimStyle}>{cell}</Animated.View>
            ) : (
              cell
            );
          }}
        />
      </View>
      <SkyFlightZone style={{ flex: 1, marginTop: STORY_BLOCK_GAP }} />
      {isAsking && (
        <Reveal at={revealEnd + 400} style={{ gap: 16 }}>
          <StoryText kind="label" theme={theme} style={{ fontSize: 17 }}>
            {t("recaps_story_sleep_ask", { count: roughCount })}
          </StoryText>
          <AskButtons onSkip={onSkip} onLook={onLook} />
        </Reveal>
      )}
    </View>
  );
};

// ---------------------------------------------------------------- one night

/** Small muted line above a title or group. Never uppercase or bold. */
const Eyebrow = ({ theme, text }: { theme: StoryTheme; text: string }) => (
  <StoryText kind="body" theme={theme} tone="muted">
    {text}
  </StoryText>
);

/**
 * After a tag's name: "most days" for tags of most days, else a count from
 * the second rough night it shows up on, else nothing.
 */
const TagTrailing = ({
  theme,
  isEveryday,
  seen,
}: {
  theme: StoryTheme;
  isEveryday: boolean;
  seen: number;
}) => {
  if (isEveryday) {
    return (
      <StoryText
        kind="label"
        theme={theme}
        tone="muted"
        style={{ fontSize: 12 }}
      >
        {t("recaps_story_rough_most_days")}
      </StoryText>
    );
  }
  // oxlint-disable-next-line no-use-before-define -- defined right below, read at render
  return seen > 0 ? <RepeatBadge theme={theme} count={seen + 1} /> : null;
};

const RepeatBadge = ({
  theme,
  count,
}: {
  theme: StoryTheme;
  count: number;
}) => {
  const palette = STORY_PALETTE[theme];
  return (
    <View
      style={{
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: RADIUS.full,
        backgroundColor: palette.text,
      }}
    >
      <StoryText
        kind="label"
        theme={theme}
        style={{ color: palette.background, fontSize: 12, lineHeight: 15 }}
      >
        {`${count}×`}
      </StoryText>
    </View>
  );
};

/** Emotion marker: category color for good emotions, an outline otherwise. */
const EmotionMarker = ({
  theme,
  emotionKey,
}: {
  theme: StoryTheme;
  emotionKey: string;
}) => {
  const emotion = EMOTION_BY_KEY.get(emotionKey);
  if (emotion && GOOD_EMOTIONS.has(emotion.category)) {
    return <EmotionIndicator emotion={emotion} compact />;
  }
  // Harder days never mirror in red: a quiet outline instead.
  return (
    <View
      style={{
        width: 9,
        height: 9,
        borderRadius: RADIUS.full,
        borderWidth: 1.5,
        borderColor: STORY_PALETTE[theme].muted,
      }}
    />
  );
};

const Chips = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
    {children}
  </View>
);

const More = ({ theme, count }: { theme: StoryTheme; count: number }) =>
  count > 0 ? (
    <View style={{ justifyContent: "center", paddingHorizontal: 6 }}>
      <StoryText kind="label" theme={theme} tone="muted">
        {t("recaps_story_rough_more", { count })}
      </StoryText>
    </View>
  ) : null;

const Group = ({
  theme,
  title,
  isEmpty,
  children,
}: {
  theme: StoryTheme;
  title: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) => (
  <View style={{ gap: 8 }}>
    <Eyebrow theme={theme} text={title} />
    {isEmpty ? (
      <StoryText kind="body" theme={theme} tone="muted">
        {t("recaps_story_rough_nothing")}
      </StoryText>
    ) : (
      children
    )}
  </View>
);

/**
 * One rough night: the evening's date and the night's sleep meter, then
 * photos, tags, people, emotions, and the note of that evening. Steps the
 * user has off never show; steps that are on but empty say so. Tags seen
 * on an earlier rough night that stand out get a count. Pixy claims nothing.
 */
export const RoughNightView = ({
  slide,
  ctx,
}: {
  slide: RoughNightSlide;
  ctx: SlideContext;
}) => {
  const theme = getStoryTheme(ctx.isDark);
  const { night, sleep } = slide;
  const labels = eveningLabels(night.evening);
  const on = (step: SleepSlide["steps"][number]) => sleep.steps.includes(step);
  const tags = night.tagIds.flatMap((id) => ctx.tags.get(id) ?? []);
  const people = night.personIds.flatMap((id) => ctx.people.get(id) ?? []);
  const load =
    tags.length +
    people.length +
    night.emotions.length +
    (night.photos.length > 0 ? 4 : 0) +
    (night.note.length > 120 ? 4 : 0);
  const isDense = load > DENSE_LOAD;
  const photoSize = isDense ? 56 : 76;
  const everyday = new Set(
    sleep.items.flatMap((item) => (item.isEveryday ? [itemKey(item)] : []))
  );
  const marked = new Set(sleep.marked);
  const groupGap = isDense ? 14 : 20;

  return (
    <View style={{ flex: 1, gap: groupGap }}>
      <Reveal at={0}>
        <Eyebrow
          theme={theme}
          text={t("recaps_story_rough_eyebrow", {
            position: slide.position,
            count: slide.count,
          })}
        />
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginTop: 10,
          }}
        >
          <View>
            <StoryText kind="title" theme={theme}>
              {labels.date}
            </StoryText>
            <StoryText kind="body" theme={theme} tone="muted">
              {labels.weekday}
            </StoryText>
          </View>
          <View accessible accessibilityLabel={meterLabel(night.quality)}>
            <SleepQualityMeter value={night.quality} height={56} />
          </View>
        </View>
      </Reveal>
      {on("photos") && night.photos.length > 0 && (
        <Reveal at={150} style={{ flexDirection: "row", gap: 8 }}>
          {night.photos.length === 1 ? (
            <StoryImage
              photo={night.photos[0]}
              style={{
                flex: 1,
                height: isDense ? 96 : 132,
                borderRadius: RADIUS.lg,
              }}
            />
          ) : (
            night.photos.slice(0, CAP.photos).map((photo) => (
              <StoryImage
                key={photo.id}
                photo={photo}
                style={{
                  width: photoSize,
                  height: photoSize,
                  borderRadius: RADIUS.lg,
                }}
              />
            ))
          )}
          {night.photos.length > CAP.photos && (
            <View
              style={{
                width: photoSize,
                height: photoSize,
                borderRadius: RADIUS.lg,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: STORY_PALETTE[theme].glass,
              }}
            >
              <StoryText kind="label" theme={theme}>
                {`+${night.photos.length - CAP.photos}`}
              </StoryText>
            </View>
          )}
        </Reveal>
      )}
      {on("tags") && (
        <Reveal at={250}>
          <Group
            theme={theme}
            title={t("recaps_story_rough_tags")}
            isEmpty={tags.length === 0}
          >
            <Chips>
              {tags.slice(0, CAP.tags).map((tag) => {
                const key = itemKey({ kind: "tag", id: tag.id });
                const before = marked.has(key)
                  ? seenBefore(sleep, key, slide.position)
                  : 0;
                return (
                  <GlassChip
                    key={tag.id}
                    theme={theme}
                    marker={<TagDot tag={tag} />}
                    label={tag.title}
                    trailing={
                      <TagTrailing
                        theme={theme}
                        isEveryday={everyday.has(key)}
                        seen={before}
                      />
                    }
                    isSmall={isDense}
                  />
                );
              })}
              <More theme={theme} count={tags.length - CAP.tags} />
            </Chips>
          </Group>
        </Reveal>
      )}
      {on("people") && (
        <Reveal at={350}>
          <Group
            theme={theme}
            title={t("recaps_story_rough_people")}
            isEmpty={people.length === 0}
          >
            <Chips>
              {people.slice(0, CAP.people).map((person) => (
                <GlassChip
                  key={person.id}
                  theme={theme}
                  marker={
                    <RingedAvatar person={person} size={isDense ? 18 : 22} />
                  }
                  label={person.name}
                  isSmall={isDense}
                  isPerson
                />
              ))}
              <More theme={theme} count={people.length - CAP.people} />
            </Chips>
          </Group>
        </Reveal>
      )}
      {on("emotions") && (
        <Reveal at={450}>
          <Group
            theme={theme}
            title={t("recaps_story_rough_felt")}
            isEmpty={night.emotions.length === 0}
          >
            <Chips>
              {night.emotions.slice(0, CAP.emotions).map((key) => (
                <GlassChip
                  key={key}
                  theme={theme}
                  marker={<EmotionMarker theme={theme} emotionKey={key} />}
                  label={tDynamic(`log_emotion_${key}`)}
                  isSmall={isDense}
                />
              ))}
              <More
                theme={theme}
                count={night.emotions.length - CAP.emotions}
              />
            </Chips>
          </Group>
        </Reveal>
      )}
      {on("message") && (
        <Reveal at={550}>
          <Group
            theme={theme}
            title={t("recaps_story_rough_note")}
            isEmpty={night.note.length === 0}
          >
            <StoryText
              kind="body"
              theme={theme}
              numberOfLines={isDense ? 2 : 5}
            >
              {night.note}
            </StoryText>
          </Group>
        </Reveal>
      )}
      <SkyFlightZone style={{ flex: 1 }} />
    </View>
  );
};

// ---------------------------------------------------------------- all nights

/**
 * What one overview row shows: tags, people, and a photo. Without those,
 * emotions; without emotions, the note or "Nothing logged".
 */
const OverviewItems = ({
  theme,
  night,
  tags,
  people,
}: {
  theme: StoryTheme;
  night: RoughNightSlide["night"];
  tags: Tag[];
  people: Person[];
}) => {
  if (tags.length > 0 || people.length > 0 || night.photos.length > 0) {
    return (
      <>
        {tags.slice(0, 4).map((tag) => (
          <GlassChip
            key={tag.id}
            theme={theme}
            marker={<TagDot tag={tag} size={7} />}
            label={tag.title}
            isSmall
          />
        ))}
        {people.slice(0, 3).map((person) => (
          <RingedAvatar key={person.id} person={person} size={24} />
        ))}
        {night.photos.slice(0, 1).map((photo) => (
          <StoryImage
            key={photo.id}
            photo={photo}
            style={{ width: 26, height: 26, borderRadius: RADIUS.sm }}
          />
        ))}
      </>
    );
  }
  if (night.emotions.length > 0) {
    return night.emotions.slice(0, 3).map((key) => (
      <GlassChip
        key={key}
        theme={theme}
        // oxlint-disable-next-line no-use-before-define -- defined above the night slide, read at render
        marker={<EmotionMarker theme={theme} emotionKey={key} />}
        label={tDynamic(`log_emotion_${key}`)}
        isSmall
      />
    ));
  }
  return (
    <StoryText
      kind="label"
      theme={theme}
      tone="muted"
      numberOfLines={2}
      style={{ fontSize: 13, fontWeight: "400" }}
    >
      {night.note || t("recaps_story_rough_nothing")}
    </StoryText>
  );
};

/** Every rough night in one row each, so repeats are easy to spot. */
export const RoughNightsAll = ({
  slide,
  ctx,
}: {
  slide: RoughNightsAllSlide;
  ctx: SlideContext;
}) => {
  const theme = getStoryTheme(ctx.isDark);
  const palette = STORY_PALETTE[theme];
  const title = t("recaps_story_rough_all_title", {
    count: slide.sleep.roughNights.length,
  });
  return (
    <View style={{ flex: 1 }}>
      <Eyebrow theme={theme} text={t("recaps_story_rough_nights")} />
      <View style={{ marginTop: 8 }}>
        <SlideHeader theme={theme} title={title} />
      </View>
      <Reveal at={titleRevealEnd(title)} style={{ marginTop: 6 }}>
        <StoryText kind="body" theme={theme} tone="muted">
          {t("recaps_story_rough_all_hint")}
        </StoryText>
      </Reveal>
      <View style={{ gap: 6, marginTop: 20 }}>
        {slide.sleep.roughNights.map((night, index) => {
          const tags = night.tagIds.flatMap((id) => ctx.tags.get(id) ?? []);
          const people = night.personIds.flatMap(
            (id) => ctx.people.get(id) ?? []
          );
          return (
            <Reveal
              key={night.evening}
              at={titleRevealEnd(title) + 200 + index * 90}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: RADIUS.lg,
                borderWidth: 1,
                borderColor: palette.chipBorder,
                backgroundColor: palette.glass,
              }}
            >
              <View style={{ width: 44 }}>
                <StoryText kind="label" theme={theme} style={{ fontSize: 12 }}>
                  {dayjs(night.evening).format("ddd")}
                </StoryText>
                <StoryText
                  kind="label"
                  theme={theme}
                  tone="muted"
                  style={{ fontSize: 12, fontWeight: "400" }}
                >
                  {dayjs(night.evening).format("D MMM")}
                </StoryText>
              </View>
              <SleepQualityMeter value={night.quality} height={28} />
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 4,
                  alignItems: "center",
                }}
              >
                <OverviewItems
                  theme={theme}
                  night={night}
                  tags={tags}
                  people={people}
                />
              </View>
            </Reveal>
          );
        })}
      </View>
      <SkyFlightZone style={{ flex: 1 }} />
    </View>
  );
};

// ---------------------------------------------------------------- question

type Palette = (typeof STORY_PALETTE)[StoryTheme];

const chipFill = (palette: Palette, isSelected: boolean, isDashed: boolean) => {
  if (isSelected) {
    return STORY_SELECTED_CHIP.fill;
  }
  return isDashed ? "transparent" : palette.glass;
};

const chipText = (palette: Palette, isSelected: boolean, isDashed: boolean) => {
  if (isSelected) {
    return STORY_SELECTED_CHIP.text;
  }
  return isDashed ? palette.muted : palette.text;
};

/** Outline: a dashed chip needs a clearer edge, it has no fill. */
const chipEdge = (palette: Palette, isSelected: boolean, isDashed: boolean) => {
  if (isSelected) {
    return STORY_SELECTED_CHIP.fill;
  }
  return isDashed ? palette.glassBorder : palette.chipBorder;
};

/** Count after an item on the question: "most days", or the rough nights. */
const itemCount = (item: RoughNightItem) =>
  item.isEveryday ? t("recaps_story_rough_most_days") : `${item.nights}×`;

const PickChip = ({
  theme,
  isSelected,
  onPress,
  marker,
  label,
  trailing,
  isDashed = false,
  isPerson = false,
  testID,
}: {
  theme: StoryTheme;
  isSelected: boolean;
  onPress: () => void;
  marker?: React.ReactNode;
  label: string;
  trailing?: string;
  isDashed?: boolean;
  isPerson?: boolean;
  testID?: string;
}) => {
  const palette = STORY_PALETTE[theme];
  return (
    <Pressable
      accessibilityRole={isDashed ? "button" : "checkbox"}
      accessibilityState={isDashed ? undefined : { checked: isSelected }}
      accessibilityLabel={trailing ? `${label}, ${trailing}` : label}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 14,
        paddingLeft: chipInset(false, isPerson),
        paddingVertical: 8,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderStyle: isDashed ? "dashed" : "solid",
        borderColor: chipEdge(palette, isSelected, isDashed),
        backgroundColor: chipFill(palette, isSelected, isDashed),
        boxShadow: isSelected ? STORY_SELECTED_CHIP.shadow : undefined,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      {marker}
      <StoryText
        kind="label"
        theme={theme}
        numberOfLines={1}
        style={{
          color: chipText(palette, isSelected, isDashed),
        }}
      >
        {label}
      </StoryText>
      {trailing !== undefined && (
        <StoryText
          kind="label"
          theme={theme}
          style={{
            fontSize: 12,
            fontWeight: "500",
            color: isSelected ? STORY_SELECTED_CHIP.muted : palette.muted,
          }}
        >
          {trailing}
        </StoryText>
      )}
    </Pressable>
  );
};

/**
 * What the user thinks was behind the rough nights: tags and people of
 * those evenings, "Not sure", and "I missed a tag". The story waits until
 * Done.
 */
export const RoughNightsAsk = ({
  slide,
  ctx,
  answer,
  onToggle,
  onNotSure,
  onMissed,
  onDone,
}: {
  slide: RoughNightsAskSlide;
  ctx: SlideContext;
  answer: RoughNightsAnswer;
  onToggle: (key: string) => void;
  onNotSure: () => void;
  onMissed: () => void;
  onDone: () => void;
}) => {
  const press = use(StoryPressContext);
  const theme = getStoryTheme(ctx.isDark);
  const palette = STORY_PALETTE[theme];
  const title = t("recaps_story_rough_ask_title");
  const at = titleRevealEnd(title);
  const added = answer.added.flatMap(({ tagId }) => ctx.tags.get(tagId) ?? []);
  // A tag added here also lands in the evenings, so the deck lists it too.
  const addedIds = new Set(answer.added.map(({ tagId }) => tagId));
  const items = slide.sleep.items
    .filter((item) => item.kind !== "tag" || !addedIds.has(item.id))
    .slice(0, 9);
  const section = (kind: RoughNightItem["kind"], heading: string) => {
    const list = items.filter((item) => item.kind === kind);
    const extra = kind === "tag" ? added : [];
    if (list.length === 0 && extra.length === 0) {
      return null;
    }
    return (
      <View style={{ gap: 8 }}>
        <Eyebrow theme={theme} text={heading} />
        <Chips>
          {extra.map((tag) => (
            <PickChip
              key={tag.id}
              theme={theme}
              isSelected={answer.picks.has(`tag:${tag.id}`)}
              onPress={() => onToggle(`tag:${tag.id}`)}
              marker={<TagDot tag={tag} />}
              label={tag.title}
              trailing={t("recaps_story_rough_added")}
            />
          ))}
          {list.map((item) => {
            const key = itemKey(item);
            const tag = item.kind === "tag" ? ctx.tags.get(item.id) : undefined;
            const person =
              item.kind === "person" ? ctx.people.get(item.id) : undefined;
            if (!tag && !person) {
              return null;
            }
            return (
              <PickChip
                key={key}
                theme={theme}
                isSelected={answer.picks.has(key)}
                onPress={() => onToggle(key)}
                marker={
                  tag ? (
                    <TagDot tag={tag} />
                  ) : (
                    person && <RingedAvatar person={person} size={20} />
                  )
                }
                label={tag?.title ?? person?.name ?? ""}
                isPerson={!tag && person !== undefined}
                trailing={itemCount(item)}
                testID={`recap-rough-pick-${item.kind}`}
              />
            );
          })}
        </Chips>
      </View>
    );
  };
  return (
    // Taps between the chips stay on the question: only Done moves on.
    <Pressable
      accessible={false}
      onPress={noop}
      onLongPress={() => press?.setIsHolding(true)}
      onPressOut={() => press?.setIsHolding(false)}
      delayLongPress={200}
      style={{ flex: 1 }}
    >
      <Eyebrow theme={theme} text={t("recaps_story_rough_nights")} />
      <View style={{ marginTop: 8 }}>
        <SlideHeader theme={theme} title={title} />
      </View>
      <Reveal at={at} style={{ gap: 18, marginTop: 20 }}>
        {section("tag", t("recaps_story_rough_tags"))}
        {section("person", t("recaps_story_rough_people_short"))}
        <Chips>
          <PickChip
            theme={theme}
            isSelected={answer.isNotSure}
            onPress={onNotSure}
            label={t("recaps_story_rough_not_sure")}
            testID="recap-rough-not-sure"
          />
          <PickChip
            theme={theme}
            isSelected={false}
            onPress={onMissed}
            marker={<Plus width={14} height={14} color={palette.muted} />}
            label={t("recaps_story_rough_missed")}
            isDashed
            testID="recap-rough-missed"
          />
        </Chips>
        <StoryText
          kind="label"
          theme={theme}
          tone="muted"
          style={{ fontWeight: "400" }}
        >
          {t("recaps_story_rough_ask_hint")}
        </StoryText>
      </Reveal>
      <SkyFlightZone style={{ flex: 1 }} />
      <Button
        type="primary"
        disabled={answer.picks.size === 0 && !answer.isNotSure}
        onPress={onDone}
        testID="recap-rough-done"
      >
        {t("recaps_story_rough_done")}
      </Button>
    </Pressable>
  );
};

// ---------------------------------------------------------------- closing

/**
 * Calm end of the rough nights: no confetti, no score. The user's picks,
 * then back to the recap.
 */
export const RoughNightsClosing = ({
  ctx,
  answer,
  onBack,
}: {
  ctx: SlideContext;
  answer: RoughNightsAnswer;
  onBack: () => void;
}) => {
  const theme = getStoryTheme(ctx.isDark);
  const title = t("recaps_story_rough_closing_title");
  const picks = [...answer.picks].flatMap((key) => {
    const [kind, id] = [
      key.slice(0, key.indexOf(":")),
      key.slice(key.indexOf(":") + 1),
    ];
    const tag = kind === "tag" ? ctx.tags.get(id) : undefined;
    const person = kind === "person" ? ctx.people.get(id) : undefined;
    if (tag) {
      return [
        <GlassChip
          key={key}
          theme={theme}
          marker={<TagDot tag={tag} />}
          label={tag.title}
          isSmall
        />,
      ];
    }
    if (person) {
      return [
        <GlassChip
          key={key}
          theme={theme}
          marker={<RingedAvatar person={person} size={18} />}
          isPerson
          label={person.name}
          isSmall
        />,
      ];
    }
    return [];
  });
  return (
    <View style={{ flex: 1 }}>
      <Eyebrow theme={theme} text={t("recaps_story_rough_nights")} />
      <View style={{ marginTop: 8 }}>
        <SlideHeader theme={theme} title={title} />
      </View>
      <Reveal at={titleRevealEnd(title)} style={{ gap: 20, marginTop: 10 }}>
        <StoryText kind="body" theme={theme} tone="muted">
          {t("recaps_story_rough_closing_body")}
        </StoryText>
        {picks.length > 0 && <Chips>{picks}</Chips>}
      </Reveal>
      <SkyFlightZone style={{ flex: 1 }} />
      <Button type="glass" onPress={onBack} testID="recap-rough-back">
        {t("recaps_story_rough_back")}
      </Button>
    </View>
  );
};
