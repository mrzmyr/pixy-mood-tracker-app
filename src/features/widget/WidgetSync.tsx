import * as Sentry from "@sentry/react-native";
import { widgetsDirectory } from "expo-widgets";
import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import { AppState, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { useLogState, useLogUpdater } from "@/features/logs";
import { createStructuredError } from "@/lib/errors";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlagState } from "@/state/featureFlags";
import { useSetting } from "@/state/settings";
import {
  getCheckInLogItem,
  getCheckInTapId,
  getUnimportedTaps,
} from "./checkIn";
import { getSchemeColors, getYearGrid } from "./widgetData";
import type { YearImages } from "./widgetData";
import type { CheckInTap } from "./widgetProps";
import {
  YEAR_BAND_ROWS,
  YEAR_MONTH_ROWS,
  YearPixelsCanvas,
} from "./YearPixelsCanvas";
import { IS_WIDGET_SUPPORTED, readCheckInTaps, syncWidgets } from "./widgets";

/** Wait for a burst of changes (import, reset) before one widget update. */
const SYNC_DEBOUNCE_MS = 400;

/** Default color scale when the setting holds an unknown key. */
const DEFAULT_SCALE = "ColorBrew-RdYlGn";

/**
 * Captures the year grid of one scheme and moves it into the shared widget
 * directory. Returns the `file://` URI.
 */
const captureYearImage = async (view: View, name: string) => {
  const captured = await captureRef(view, { format: "png", quality: 1 });
  // view-shot returns a bare path; the file system API wants a file URI.
  const from = captured.startsWith("file://") ? captured : `file://${captured}`;
  const target = `${widgetsDirectory}year-${name}.png`;
  await FileSystem.deleteAsync(target, { idempotent: true });
  await FileSystem.copyAsync({ from, to: target });
  // The source stays in view-shot's tmp folder: the file system API cannot
  // delete there, and view-shot clears it on the next launch.
  return target;
};

/**
 * Keeps the home screen widgets in sync with entries, the color scale, and
 * the `ios-widget` flag (off: widgets show "Not available").
 * First turns check-in widget taps into entries; adding them changes
 * `items`, and the next sync clears the imported taps from the widget.
 * Renders the year grid off screen, captures it as an image for the year
 * widget, then pushes every timeline. Also resyncs when the app returns to
 * the foreground, so the timeline never runs out while the app stays
 * installed.
 */
export const WidgetSync = () => {
  const { items, loaded } = useLogState();
  const logUpdater = useLogUpdater();
  const analytics = useAnalytics();
  const scaleType = useSetting("scaleType") ?? DEFAULT_SCALE;
  const reminderEnabled = useSetting("reminderEnabled") ?? false;
  const reminderTime = useSetting("reminderTime") ?? null;
  // Two syncs can read the same taps before `items` updates (start and
  // foreground fire together), so remember what was already added.
  const importedTapIds = useRef(new Set<string>());
  const importTaps = useEffectEvent((taps: CheckInTap[]) => {
    const fresh = taps.filter(
      (tap) => !importedTapIds.current.has(getCheckInTapId(tap))
    );
    for (const tap of fresh) {
      importedTapIds.current.add(getCheckInTapId(tap));
      logUpdater.addLog(getCheckInLogItem(tap));
    }
    if (fresh.length > 0) {
      analytics.track("widget:check_in_imported", { count: fresh.length });
    }
  });
  const flagState = useFeatureFlagState("ios-widget");
  // One view per captured row: [scheme][layout][row].
  const rowRefs = useRef<Record<string, View | null>>({});

  const grid = useMemo(
    () =>
      IS_WIDGET_SUPPORTED && loaded
        ? getYearGrid({ items, scaleType, url: "" })
        : null,
    [items, loaded, scaleType]
  );

  useEffect(() => {
    // Wait for the flag: a `loading` state must not flash "Not available".
    if (!IS_WIDGET_SUPPORTED || !loaded || flagState === "loading") {
      return;
    }
    const isAvailable = flagState === "on";
    const captureRows = (
      scheme: "light" | "dark",
      layout: "band" | "months",
      count: number
    ) => {
      const names = Array.from(
        { length: count },
        (_, row) => `${scheme}-${layout}-${row}`
      );
      return Promise.all(
        names.map((name) => {
          const view = rowRefs.current[name];
          if (!view) {
            throw createStructuredError({
              status: "widget_year_row_missing",
              message: "Year widget row view is not mounted",
              why: `No view for ${name} when the sync started`,
              fix: "Open Pixy again; the year widget keeps its last image",
            });
          }
          return captureYearImage(view, name);
        })
      );
    };
    /** Pending taps, or `null` when the widget store could not be read. */
    const readTaps = async () => {
      try {
        return await readCheckInTaps();
      } catch (error) {
        const structuredError = createStructuredError({
          status: "widget_check_in_read_failed",
          message: "Check-in widget taps could not be read",
          why: `expo-widgets failed: ${error instanceof Error ? error.message : String(error)}`,
          fix: "Open Pixy again; the widget keeps its taps until the next import",
        });
        console.error(structuredError);
        Sentry.captureException(structuredError);
        return null;
      }
    };
    const sync = async () => {
      const taps = await readTaps();
      const unimported = taps === null ? null : getUnimportedTaps(taps, items);
      if (unimported !== null && unimported.length > 0) {
        importTaps(unimported);
        // The new entries change `items`; that sync writes the widgets.
        return;
      }
      let yearImages: YearImages | undefined;
      try {
        if (isAvailable && widgetsDirectory) {
          yearImages = {
            light: await captureRows("light", "band", YEAR_BAND_ROWS),
            dark: await captureRows("dark", "band", YEAR_BAND_ROWS),
            lightLarge: await captureRows("light", "months", YEAR_MONTH_ROWS),
            darkLarge: await captureRows("dark", "months", YEAR_MONTH_ROWS),
            version: Date.now(),
          };
        }
      } catch (error) {
        const structuredError = createStructuredError({
          status: "widget_year_image_failed",
          message: "Year widget image could not be captured",
          why: `react-native-view-shot failed: ${error instanceof Error ? error.message : String(error)}`,
          fix: "Open Pixy again; the year widget keeps its last image",
        });
        console.error(structuredError);
        Sentry.captureException(structuredError);
      }
      await syncWidgets({
        items,
        scaleType,
        isAvailable,
        yearImages,
        reminderTime: reminderEnabled ? reminderTime : null,
        checkInTaps: unimported,
      });
    };
    const timeout = setTimeout(() => {
      void sync();
    }, SYNC_DEBOUNCE_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void sync();
      }
    });
    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, [items, loaded, scaleType, flagState, reminderEnabled, reminderTime]);

  if (grid === null) {
    return null;
  }

  // Behind the app content: the root view is opaque and covers it.
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", top: 0, left: 0, zIndex: -1 }}
    >
      {(["light", "dark"] as const).flatMap((scheme) =>
        (
          [
            ["band", YEAR_BAND_ROWS],
            ["months", YEAR_MONTH_ROWS],
          ] as const
        ).flatMap(([layout, count]) =>
          Array.from({ length: count }, (_, row) => (
            <YearPixelsCanvas
              key={`${scheme}-${layout}-${row}`}
              ref={(view) => {
                rowRefs.current[`${scheme}-${layout}-${row}`] = view;
              }}
              grid={grid}
              layout={layout}
              row={row}
              colors={getSchemeColors(scheme, scaleType)}
            />
          ))
        )
      )}
    </View>
  );
};
