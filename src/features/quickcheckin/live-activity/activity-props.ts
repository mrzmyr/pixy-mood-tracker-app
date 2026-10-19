import Constants from "expo-constants";
import Colors from "@/constants/colors";
import scales from "@/constants/colors/scales";
import { RATING_KEYS } from "@/constants/ratings";
import { EMOTIONS } from "@/features/logger";
import type { LogItem } from "@/features/logs";
import { t } from "@/lib/translation";
import type { Emotion } from "@/types";
import { checkInTarget } from "../check-in-state";
import type { CheckInState } from "../check-in-state";
import { getGlanceLabels } from "../ranking";
import type { InfluenceOption } from "../ranking";

/**
 * One button in a row of the Live Activity. `target` names the tap for
 * {@link tapCheckIn}.
 *
 * - `chip`: an emotion, person, or tag
 * - `more`: dashed More, opens `moreUrl`
 * - `action`: white pill (Next or Save), sits at the row end
 */
export interface ActivityItem {
  kind: "chip" | "more" | "action";
  target: string;
  label: string;
  isSelected: boolean;
  /** Redacted while the device is locked: people and tag names. */
  isPrivate: boolean;
  /** Emotion category or tag color. `""` shows no dot. */
  dot: string;
  /** Person symbol instead of a dot. */
  isPerson: boolean;
  /** Profile photo file in `imageDirectory`. `""` shows the person symbol. */
  image: string;
}

/**
 * Everything the Live Activity renders. The widget runtime has no
 * translations or theme, so labels and colors come in here. Keep it small:
 * ActivityKit caps an update at 4 KB. Empty values are `""` or `[]`, never
 * `null`: the widget runtime drops `null` props.
 */
export interface QuickCheckInActivityProps {
  step: CheckInState["step"];
  question: string;
  /** Colors of today's entries, oldest first, at most 8. */
  today: string[];
  /** One button per rating, worst first. Empty after the mood step. */
  moods: { target: string; color: string }[];
  /** Chips, More, and the action, already wrapped into rows. */
  rows: ActivityItem[][];
  /** Opens the quick check-in screen on the saved entry. */
  moreUrl: string;
  /** Shared widget folder (`file://…/`) that holds the profile photos. */
  imageDirectory: string;
  /** Done step: "Saved" and what was picked. */
  doneTitle: string;
  doneDetail: string;
}

/** Most entries in the Today strip. */
const TODAY_STRIP_LENGTH = 8;

/** Default color scale when the setting holds an unknown key. */
const DEFAULT_SCALE = "ColorBrew-RdYlGn";

/**
 * Row width in points that fits the Lock Screen and the narrower Dynamic
 * Island on a 375 pt wide iPhone.
 */
export const ROW_WIDTH = 300;

/**
 * Most rows. A Lock Screen Live Activity is at most 160 pt high: header,
 * three rows, and padding fit.
 */
export const MAX_ROWS = 3;

/** Space between two buttons in a row, in points. */
const GAP = 6;

/**
 * Rough text width at 13 pt. Overestimates Latin text, so a row never
 * wraps in SwiftUI; CJK glyphs are about one em wide.
 */
const textWidth = (label: string) => {
  let width = 0;
  for (const character of label) {
    width += (character.codePointAt(0) ?? 0) >= 0x2e_80 ? 13 : 7.6;
  }
  return width;
};

/** Estimated button width in points. Matches the paddings in the layout. */
export const getItemWidth = (item: ActivityItem) => {
  if (item.kind === "action") {
    return 32 + textWidth(item.label) * 1.1;
  }
  let icon = item.isPerson || item.dot !== "" ? 14 : 0;
  if (item.image !== "") {
    icon = 22;
  }
  return 20 + icon + textWidth(item.label);
};

const rowWidth = (row: ActivityItem[]) =>
  row.reduce(
    (sum, item, index) => sum + getItemWidth(item) + (index > 0 ? GAP : 0),
    0
  );

/**
 * Wraps chips into at most `MAX_ROWS` rows of `ROW_WIDTH`, best ranked
 * first, and puts `tail` (More, the action) at the end of the last row.
 * Chips that do not fit are left out: More lists them.
 */
export const packRows = (
  chips: ActivityItem[],
  tail: ActivityItem[]
): ActivityItem[][] => {
  let current: ActivityItem[] = [];
  const rows: ActivityItem[][] = [current];
  for (const chip of chips) {
    if (rowWidth([...current, chip]) <= ROW_WIDTH) {
      current.push(chip);
    } else if (rows.length < MAX_ROWS) {
      current = [chip];
      rows.push(current);
    } else {
      break;
    }
  }
  if (rowWidth([...current, ...tail]) > ROW_WIDTH) {
    if (rows.length < MAX_ROWS) {
      current = [];
      rows.push(current);
    } else {
      while (
        current.length > 0 &&
        rowWidth([...current, ...tail]) > ROW_WIDTH
      ) {
        current.pop();
      }
    }
  }
  current.push(...tail);
  return rows.filter((row) => row.length > 0);
};

/** Deep link into the app, for example `pixy://check-in/new`. */
export const getAppUrl = (path: string) => {
  const { scheme } = Constants.expoConfig ?? {};
  const first = Array.isArray(scheme) ? scheme[0] : scheme;
  return `${first ?? "pixy"}://${path}`;
};

const getScale = (scaleType: string) =>
  scales.dark[scaleType] ?? scales.dark[DEFAULT_SCALE];

/**
 * Same category colors as the app's emotion dots: `good` uses `very_good`,
 * `bad` uses `very_bad`.
 */
const getCategoryColor = (
  category: Emotion["category"],
  scale: ReturnType<typeof getScale>
) => {
  if (category === "very_good" || category === "good") {
    return scale.very_good.background;
  }
  if (category === "bad" || category === "very_bad") {
    return scale.very_bad.background;
  }
  return scale.neutral.background;
};

const findEmotion = (key: string) =>
  EMOTIONS.find((emotion) => emotion.key === key);

const BUTTON = {
  isSelected: false,
  isPrivate: false,
  dot: "",
  isPerson: false,
  image: "",
};

const moreItem = (): ActivityItem => ({
  ...BUTTON,
  kind: "more",
  target: "",
  label: `${t("more")}…`,
});

const actionItem = (target: string, label: string): ActivityItem => ({
  ...BUTTON,
  kind: "action",
  target,
  label,
});

const isPicked = (state: CheckInState, option: InfluenceOption) =>
  state.picked.includes(`${option.kind}:${option.id}`);

const influenceChips = (
  state: CheckInState,
  slots: InfluenceOption[],
  thumbs: Record<string, string>
): ActivityItem[] => {
  const labels = getGlanceLabels(slots);
  return slots.map((option, index) => ({
    kind: "chip",
    target: checkInTarget.influence(option),
    label: labels[index] ?? option.label,
    isSelected: isPicked(state, option),
    isPrivate: true,
    dot:
      option.kind === "tag" ? (Colors.dark.tags[option.color]?.dot ?? "") : "",
    isPerson: option.kind === "person",
    image: option.kind === "person" ? (thumbs[option.id] ?? "") : "",
  }));
};

/**
 * Props for the current step. The card is always dark, like the Dynamic
 * Island, so colors come from the dark theme and the user's color scale.
 */
export const getActivityProps = ({
  state,
  scaleType,
  todayRatings,
  thumbs = {},
  imageDirectory = "",
}: {
  state: CheckInState;
  scaleType: string;
  /** Today's entries, oldest first. */
  todayRatings: LogItem["rating"][];
  /** Profile photo file names by person id, from `syncAvatarThumbs`. */
  thumbs?: Record<string, string>;
  imageDirectory?: string;
}): QuickCheckInActivityProps => {
  const scale = getScale(scaleType);
  const base = {
    step: state.step,
    today: todayRatings
      .slice(-TODAY_STRIP_LENGTH)
      .map((rating) => scale[rating].background),
    moods: [],
    rows: [],
    moreUrl: getAppUrl(`check-in/${state.entryId || "new"}`),
    imageDirectory,
    doneTitle: "",
    doneDetail: "",
  };

  if (state.step === "mood" || state.rating === "") {
    return {
      ...base,
      step: "mood",
      question: t("quick_check_in_question"),
      moods: [...RATING_KEYS].reverse().map((rating) => ({
        target: checkInTarget.mood(rating),
        color: scale[rating].background,
      })),
    };
  }

  if (state.step === "emotion") {
    const chips = state.emotionSlots.map((key): ActivityItem => {
      const emotion = findEmotion(key);
      return {
        ...BUTTON,
        kind: "chip",
        target: checkInTarget.emotion(key),
        label: emotion?.label ?? key,
        dot: emotion ? getCategoryColor(emotion.category, scale) : "",
      };
    });
    return {
      ...base,
      question: t("log_emotions_question"),
      rows: packRows(chips, [moreItem()]),
    };
  }

  if (state.step === "people") {
    const action =
      state.tagSlots.length > 0
        ? actionItem(checkInTarget.next, t("quick_check_in_next"))
        : actionItem(checkInTarget.finish, t("save"));
    return {
      ...base,
      question: t("log_people_question"),
      rows: packRows(influenceChips(state, state.peopleSlots, thumbs), [
        moreItem(),
        action,
      ]),
    };
  }

  if (state.step === "tags") {
    return {
      ...base,
      question: t("quick_check_in_tags_question"),
      rows: packRows(influenceChips(state, state.tagSlots, thumbs), [
        moreItem(),
        actionItem(checkInTarget.finish, t("save")),
      ]),
    };
  }

  const slots = [...state.peopleSlots, ...state.tagSlots];
  const labels = getGlanceLabels(slots);
  const picks = slots.flatMap((option, index) =>
    isPicked(state, option) ? [labels[index] ?? option.label] : []
  );
  const emotion = findEmotion(state.emotion);
  return {
    ...base,
    question: "",
    doneTitle: t("quick_check_in_saved"),
    // Never the rating label: hard days get no echo of the mood.
    doneDetail: [...(emotion ? [emotion.label] : []), ...picks].join(" · "),
  };
};
