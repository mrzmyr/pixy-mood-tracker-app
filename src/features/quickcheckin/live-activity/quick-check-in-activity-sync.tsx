import * as Sentry from "@sentry/react-native";
import dayjs from "dayjs";
import {
  addUserInteractionListener,
  after,
  widgetsDirectory,
} from "expo-widgets";
import type { LiveActivity } from "expo-widgets";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { v4 as uuidv4 } from "uuid";
import { DATE_FORMAT } from "@/constants/config";
import { EMOTIONS } from "@/features/logger";
import { useLogState, useLogUpdater } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import { usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import { createStructuredError } from "@/lib/errors";
import { getItemDate } from "@/lib/log-dates";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/feature-flags";
import { load, store } from "@/state/persisted";
import { useSetting } from "@/state/settings";
import { useQuickCheckInStatus } from "../use-quick-check-in-status";
import { INITIAL_CHECK_IN_STATE, tapCheckIn } from "../check-in-state";
import type { CheckInState } from "../check-in-state";
import { getActivityProps } from "./activity-props";
import type { QuickCheckInActivityProps } from "./activity-props";
import { syncAvatarThumbs } from "./avatar-thumbs";
import QuickCheckInActivity from "./quick-check-in-activity";
import { IS_LIVE_ACTIVITY_SUPPORTED } from "./support";

const STORAGE_KEY = "PIXY_QUICK_CHECK_IN_ACTIVITY";

/** How long a finished check-in stays on the Lock Screen. */
const DONE_VISIBLE_MS = 5 * 60 * 1000;

/** Default color scale when the setting holds an unknown key. */
const DEFAULT_SCALE = "ColorBrew-RdYlGn";

/**
 * Stored progress. `state` belongs to the Live Activity `activityId` on
 * screen; a new one on screen starts at the mood step.
 */
interface StoredActivity {
  state: CheckInState;
  activityId: string;
}

const INITIAL_STORED: StoredActivity = {
  state: INITIAL_CHECK_IN_STATE,
  activityId: "",
};

// Earlier builds stored a bare `CheckInState`, or one step for people and
// tags together. Both start over.
const isStoredActivity = (
  value: StoredActivity | null
): value is StoredActivity =>
  value !== null &&
  typeof value.state === "object" &&
  Array.isArray(value.state.peopleSlots) &&
  Array.isArray(value.state.tagSlots) &&
  typeof value.activityId === "string";

const report = (status: string, message: string, why: string) => {
  const structuredError = createStructuredError({
    status,
    message,
    why: `expo-widgets failed: ${why}`,
    fix: "Start the quick check-in again from Settings > Check-in",
  });
  console.error(structuredError);
  Sentry.captureException(structuredError);
};

const getTodayRatings = (items: LogItem[], today: string) =>
  items
    .filter((item) => getItemDate(item) === today)
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
    .map((item) => item.rating);

/**
 * Starts the Lock Screen check-in now, at the mood step, and ends any other
 * one. Testing only: there is no schedule yet, so Settings > Check-in is
 * the only way to start it.
 */
export const useStartQuickCheckIn = () => {
  const { items } = useLogState();
  const scaleType = useSetting("scaleType") ?? DEFAULT_SCALE;

  return async () => {
    try {
      await Promise.all(
        QuickCheckInActivity.getInstances().map((activity) =>
          activity.end("immediate")
        )
      );
      QuickCheckInActivity.start(
        getActivityProps({
          state: INITIAL_CHECK_IN_STATE,
          scaleType,
          todayRatings: getTodayRatings(items, dayjs().format(DATE_FORMAT)),
        })
      );
    } catch (error) {
      report(
        "quick_check_in_start_failed",
        "Lock Screen check-in could not start",
        String(error)
      );
    }
  };
};

/**
 * Keeps the Lock Screen check-in up to date while the setting and the
 * `quick-check-in` flag are on, and turns its taps into entries. It never
 * starts one: `useStartQuickCheckIn` does.
 *
 * - Taps arrive through `addUserInteractionListener`, also when iOS wakes
 *   the app in the background. Taps before storage loads wait in a queue.
 * - Progress survives an app restart, so a tap on an old step still finds
 *   its slot. A failed read keeps the stored value; progress then stays in
 *   memory only.
 * - Save ends the Live Activity; the saved step stays `DONE_VISIBLE_MS`.
 */
export const QuickCheckInActivitySync = () => {
  const { isEnabled, isDisabled } = useQuickCheckInStatus(
    IS_LIVE_ACTIVITY_SUPPORTED
  );
  const { items } = useLogState();
  const { people } = usePeopleState();
  const hasPeople = useFeatureFlag("people");
  const { tags } = useTagsState();
  const logUpdater = useLogUpdater();
  const scaleType = useSetting("scaleType") ?? DEFAULT_SCALE;
  const analytics = useAnalytics();

  const latest = useRef({
    items,
    people,
    tags,
    hasPeople,
    logUpdater,
    scaleType,
    analytics,
  });
  useEffect(() => {
    latest.current = {
      items,
      people,
      tags,
      hasPeople,
      logUpdater,
      scaleType,
      analytics,
    };
  });

  // Set while enabled. Reruns the schedule after entries or settings change.
  const resync = useRef<
    ((changed: Partial<typeof latest.current>) => void) | null
  >(null);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    let isActive = true;
    let stored: StoredActivity | null = null;
    let canStore = false;
    const queue: string[] = [];

    const save = (next: StoredActivity) => {
      stored = next;
      if (canStore) {
        void store(STORAGE_KEY, next);
      }
    };

    const propsFor = async (
      state: CheckInState
    ): Promise<QuickCheckInActivityProps> => {
      const slotIds = new Set(state.peopleSlots.map((slot) => slot.id));
      const thumbs = await syncAvatarThumbs(
        latest.current.people.filter((person) => slotIds.has(person.id))
      );
      return getActivityProps({
        state,
        scaleType: latest.current.scaleType,
        todayRatings: getTodayRatings(
          latest.current.items,
          dayjs().format(DATE_FORMAT)
        ),
        thumbs,
        imageDirectory: widgetsDirectory,
      });
    };

    const showProgress = async (
      activity: LiveActivity<QuickCheckInActivityProps>,
      current: StoredActivity
    ) => {
      const props = await propsFor(current.state);
      if (current.state.step === "done") {
        await activity.end(
          after(new Date(Date.now() + DONE_VISIBLE_MS)),
          props
        );
        return;
      }
      await activity.update(props);
    };

    /**
     * The newest Live Activity on screen owns the check-in; older ones end.
     * A new one on screen starts at the mood step. Runs before taps apply,
     * so the first tap on a fresh one is not reset.
     */
    const adoptVisible = () => {
      if (stored === null) {
        return { visible: undefined, older: [] };
      }
      const shown = QuickCheckInActivity.getInstances().filter((activity) => {
        const state = activity.getState();
        return state === "active" || state === "stale";
      });
      const [visible, ...older] = [...shown].reverse();
      if (visible && visible.getId() !== stored.activityId) {
        save({
          ...stored,
          state: INITIAL_CHECK_IN_STATE,
          activityId: visible.getId(),
        });
      }
      return { visible, older };
    };

    const sync = async () => {
      const { visible, older } = adoptVisible();
      if (stored === null) {
        return;
      }
      const current: StoredActivity = stored;
      await Promise.all(older.map((activity) => activity.end("immediate")));
      if (visible) {
        await showProgress(visible, current);
      }
      // Earlier builds scheduled one at the reminder time.
      const pending = QuickCheckInActivity.getInstances().filter(
        (activity) => activity.getState() === "pending"
      );
      await Promise.all(pending.map((activity) => activity.end("immediate")));
    };

    // One sync at a time: overlapping runs would apply progress twice.
    let running: Promise<void> = Promise.resolve();
    const runSync = () => {
      const previous = running;
      running = (async () => {
        await previous;
        if (!isActive) {
          return;
        }
        try {
          await sync();
        } catch (error) {
          report(
            "quick_check_in_update_failed",
            "Lock Screen check-in could not be updated",
            String(error)
          );
        }
      })();
    };

    const drain = () => {
      if (stored === null || queue.length === 0) {
        return;
      }
      adoptVisible();
      const context = latest.current;
      const current = [...context.items];
      let { state } = stored;
      for (const target of queue.splice(0)) {
        const result = tapCheckIn(state, target, {
          items: current,
          people: context.hasPeople ? context.people : [],
          tags: context.tags,
          emotions: EMOTIONS,
          now: dayjs(),
          newId: uuidv4(),
        });
        const { change } = result;
        if (change?.type === "add") {
          context.logUpdater.addLog(change.item);
          context.analytics.track("quick_check_in:entry_saved", {
            source: "live_activity",
            rating: change.item.rating,
          });
          // Later taps in this batch must see the new entry.
          current.push(change.item);
        }
        if (change?.type === "edit") {
          context.logUpdater.editLog(change.item);
          const index = current.findIndex((item) => item.id === change.item.id);
          if (index !== -1) {
            current[index] = { ...current[index], ...change.item };
          }
        }
        if (result.state.step === "done" && state.step !== "done") {
          context.analytics.track("quick_check_in:completed", {
            source: "live_activity",
            has_emotion: result.state.emotion !== "",
            influences_count: result.state.picked.length,
          });
        }
        ({ state } = result);
      }
      save({ ...stored, state });
      runSync();
    };

    const subscription = addUserInteractionListener((event) => {
      queue.push(event.target);
      drain();
    });

    const restore = async () => {
      let loaded: StoredActivity | null = null;
      try {
        loaded = await load<StoredActivity>(STORAGE_KEY);
        canStore = true;
      } catch {
        // `load` reports the error. Keep the stored value untouched.
      }
      if (!isActive) {
        return;
      }
      if (stored === null) {
        stored = isStoredActivity(loaded) ? loaded : INITIAL_STORED;
      }
      // The Live Activity on screen may be new: sync before taps apply.
      runSync();
      await running;
      drain();
    };
    void restore();

    resync.current = (changed) => {
      latest.current = { ...latest.current, ...changed };
      runSync();
    };
    const appState = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        runSync();
      }
    });

    return () => {
      isActive = false;
      resync.current = null;
      subscription.remove();
      appState.remove();
    };
  }, [isEnabled]);

  // New entries fill the Today strip.
  useEffect(() => {
    resync.current?.({ items, scaleType });
  }, [items, scaleType]);

  // Off: remove the check-in from the Lock Screen.
  useEffect(() => {
    if (!isDisabled) {
      return;
    }
    const end = async () => {
      try {
        await Promise.all(
          QuickCheckInActivity.getInstances().map((activity) =>
            activity.end("immediate")
          )
        );
      } catch (error) {
        report(
          "quick_check_in_end_failed",
          "Lock Screen check-in could not end",
          String(error)
        );
      }
    };
    void end();
  }, [isDisabled]);

  return null;
};
