import dayjs from "dayjs";
import { RATING_KEYS } from "@/constants/ratings";
import type { LogItem } from "@/features/logs";
import { getSchemeColors } from "@/features/widget";
import { getRatingLabel } from "@/lib/rating-label";
import { t } from "@/lib/translation";
import type { Emotion } from "@/types";
import {
  checkInTarget,
  createQuickEntry,
  GLANCE_SLOTS,
} from "../check-in-state";
import type { EntryChange } from "../check-in-state";
import { getAppUrl } from "../live-activity/activity-props";
import { getGlanceLabels, rankEmotions, rankInfluences } from "../ranking";

interface Slot {
  target: string;
  label: string;
}

/**
 * Everything the Android notification needs to run a check-in without JS.
 * Read by `QuickCheckInStore.kt` and `QuickCheckInNotification.kt`; keep
 * the field names in sync.
 */
export interface NotificationPlan {
  copy: {
    question: string;
    emotionQuestion: string;
    influenceQuestion: string;
    skip: string;
    done: string;
    more: string;
    again: string;
    channel: string;
  };
  /** One per rating, best first. */
  moods: { target: string; label: string; color: string }[];
  /** Slots ranked for each rating, computed when the plan is built. */
  byRating: Record<string, { emotions: Slot[]; influences: Slot[] }>;
  savedTitles: Record<string, string>;
  /** Deep link prefix; the notification appends the entry id or `new`. */
  moreUrl: string;
}

/** Plan for the notification from current entries, people, and tags. */
export const getNotificationPlan = ({
  items,
  people,
  tags,
  emotions,
  scaleType,
  now = dayjs(),
}: {
  items: LogItem[];
  people: { id: string; name: string; isArchived?: boolean }[];
  tags: { id: string; title: string; isArchived?: boolean }[];
  emotions: Emotion[];
  scaleType: string;
  now?: dayjs.Dayjs;
}): NotificationPlan => {
  const colors = getSchemeColors("light", scaleType).ratings;
  const label = (key: string) =>
    emotions.find((emotion) => emotion.key === key)?.label ?? key;
  const byRating: NotificationPlan["byRating"] = {};
  // Same title on every rating: hard days get no echo of the mood.
  const savedTitles: NotificationPlan["savedTitles"] = {};
  for (const rating of RATING_KEYS) {
    const influences = rankInfluences({
      items,
      people,
      tags,
      rating,
      now,
    }).slice(0, GLANCE_SLOTS);
    const labels = getGlanceLabels(influences);
    byRating[rating] = {
      emotions: rankEmotions({ items, emotions, rating, now })
        .slice(0, GLANCE_SLOTS)
        .map((key) => ({
          target: checkInTarget.emotion(key),
          label: label(key),
        })),
      influences: influences.map((option, index) => ({
        target: checkInTarget.influence(option),
        label: labels[index] ?? option.label,
      })),
    };
    savedTitles[rating] = t("quick_check_in_saved");
  }
  return {
    copy: {
      question: t("quick_check_in_question"),
      emotionQuestion: t("log_emotions_question"),
      influenceQuestion: t("log_people_question"),
      skip: t("quick_check_in_skip"),
      done: t("done"),
      more: t("more"),
      again: t("quick_check_in_again"),
      channel: t("quick_check_in_title"),
    },
    moods: RATING_KEYS.map((rating) => ({
      target: checkInTarget.mood(rating),
      label: getRatingLabel(rating),
      color: colors[rating],
    })),
    byRating,
    savedTitles,
    moreUrl: getAppUrl("check-in/"),
  };
};

/** Entry snapshot the notification wrote while JS was not running. */
export interface InboxEntry {
  id: string;
  createdAt: string;
  rating: string;
  emotions: string[];
  people: { id: string }[];
  tags: { id: string }[];
}

const isRating = (value: string): value is LogItem["rating"] =>
  RATING_KEYS.some((rating) => rating === value);

/**
 * Store changes for inbox snapshots. Pure.
 *
 * - Known id: edit that entry. Unknown id: add a new entry at `createdAt`.
 * - People and tags deleted since the tap are dropped, the rest is saved.
 * - Snapshots with an invalid rating or time are skipped.
 */
export const getInboxChanges = (
  inbox: InboxEntry[],
  context: {
    items: LogItem[];
    people: { id: string }[];
    tags: { id: string }[];
    emotions: { key: string }[];
  }
): NonNullable<EntryChange>[] => {
  const itemIds = new Set(context.items.map((item) => item.id));
  const personIds = new Set(context.people.map((person) => person.id));
  const tagIds = new Set(context.tags.map((tag) => tag.id));
  const emotionKeys = new Set(context.emotions.map((emotion) => emotion.key));
  const changes: NonNullable<EntryChange>[] = [];
  for (const entry of inbox) {
    const createdAt = dayjs(entry.createdAt);
    if (!isRating(entry.rating) || !createdAt.isValid()) {
      continue;
    }
    const fields = {
      rating: entry.rating,
      emotions: entry.emotions.filter((key) => emotionKeys.has(key)),
      people: entry.people.filter((person) => personIds.has(person.id)),
      tags: entry.tags.filter((tag) => tagIds.has(tag.id)),
    };
    changes.push(
      itemIds.has(entry.id)
        ? { type: "edit", item: { id: entry.id, ...fields } }
        : { type: "add", item: createQuickEntry(entry.id, createdAt, fields) }
    );
  }
  return changes;
};
