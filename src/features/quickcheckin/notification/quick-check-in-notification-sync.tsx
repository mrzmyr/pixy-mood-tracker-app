import * as Sentry from "@sentry/react-native";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { EMOTIONS } from "@/features/logger";
import { useLogState, useLogUpdater } from "@/features/logs";
import { usePeopleState } from "@/features/people";
import { useTagsState } from "@/features/tags";
import { createStructuredError } from "@/lib/errors";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/feature-flags";
import { useSetting } from "@/state/settings";
import { useQuickCheckInStatus } from "../use-quick-check-in-status";
import { native } from "./native-module";
import { getInboxChanges, getNotificationPlan } from "./notification-plan";
import type { InboxEntry } from "./notification-plan";

/** Default color scale when the setting holds an unknown key. */
const DEFAULT_SCALE = "ColorBrew-RdYlGn";

const NO_PEOPLE: never[] = [];

const report = (status: string, message: string, why: string) => {
  const structuredError = createStructuredError({
    status,
    message,
    why,
    fix: "Start the quick check-in again from Settings > Check-in",
  });
  console.error(structuredError);
  Sentry.captureException(structuredError);
};

const parseInbox = (raw: string): InboxEntry[] => {
  const parsed: unknown = JSON.parse(raw);
  // SAFETY: QuickCheckInStore.kt writes only arrays of entry snapshots; getInboxChanges skips invalid fields.
  return Array.isArray(parsed) ? (parsed as InboxEntry[]) : [];
};

/**
 * Shows the Android check-in notification now, with suggestions from the
 * current entries. Testing only: there is no schedule yet, so Settings >
 * Check-in is the only way to show it. Suggestions refresh on the next
 * start.
 */
export const useStartQuickCheckInNotification = () => {
  const { items } = useLogState();
  const { people } = usePeopleState();
  const hasPeople = useFeatureFlag("people");
  const { tags } = useTagsState();
  const scaleType = useSetting("scaleType") ?? DEFAULT_SCALE;

  return () => {
    if (native === null) {
      return;
    }
    try {
      native.start(
        JSON.stringify(
          getNotificationPlan({
            items,
            people: hasPeople ? people : NO_PEOPLE,
            tags,
            emotions: EMOTIONS,
            scaleType,
          })
        )
      );
    } catch (error) {
      report(
        "quick_check_in_notification_failed",
        "Check-in notification could not be shown",
        `PixyQuickCheckIn.start failed: ${String(error)}`
      );
    }
  };
};

/**
 * Android check-in notification. Imports the entries it saved while the
 * app was closed, and removes it when the setting or the
 * `quick-check-in` flag turns off. It never shows one:
 * `useStartQuickCheckInNotification` does.
 *
 * - Taps run natively, so a check-in works with the app closed. Entries
 *   wait in the native inbox until the next import.
 * - Imports on start, on foreground, and on every tap while the app runs.
 *   The inbox is cleared only after the entries are handed to the store.
 */
export const QuickCheckInNotificationSync = () => {
  const { isEnabled, isDisabled } = useQuickCheckInStatus(native !== null);
  const { items } = useLogState();
  const { people } = usePeopleState();
  const { tags } = useTagsState();
  const logUpdater = useLogUpdater();
  const analytics = useAnalytics();

  const latest = useRef({ items, people, tags, logUpdater, analytics });
  useEffect(() => {
    latest.current = { items, people, tags, logUpdater, analytics };
  });

  useEffect(() => {
    const module = native;
    if (!isEnabled || module === null) {
      return;
    }
    const importInbox = () => {
      try {
        const raw = module.readInbox();
        const inbox = parseInbox(raw);
        if (inbox.length === 0) {
          return;
        }
        const context = latest.current;
        for (const change of getInboxChanges(inbox, {
          ...context,
          emotions: EMOTIONS,
        })) {
          if (change.type === "add") {
            context.logUpdater.addLog(change.item);
            context.analytics.track("quick_check_in:entry_saved", {
              source: "notification",
              rating: change.item.rating,
            });
          } else {
            context.logUpdater.editLog(change.item);
          }
        }
        module.clearInbox(raw);
      } catch (error) {
        report(
          "quick_check_in_import_failed",
          "Check-ins from the notification could not be imported",
          `Reading the notification inbox failed: ${String(error)}`
        );
      }
    };
    importInbox();
    const subscription = module.addListener("onInboxChanged", importInbox);
    const appState = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        importInbox();
      }
    });
    return () => {
      subscription.remove();
      appState.remove();
    };
  }, [isEnabled]);

  useEffect(() => {
    if (!isDisabled || native === null) {
      return;
    }
    try {
      native.stop();
    } catch (error) {
      report(
        "quick_check_in_notification_failed",
        "Check-in notification could not be removed",
        `PixyQuickCheckIn.stop failed: ${String(error)}`
      );
    }
  }, [isDisabled]);

  return null;
};
