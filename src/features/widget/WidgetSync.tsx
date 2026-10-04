import * as Sentry from "@sentry/react-native";
import { widgetsDirectory } from "expo-widgets";
import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useMemo, useRef } from "react";
import { AppState, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { useLogState } from "@/features/logs";
import { createStructuredError } from "@/lib/errors";
import { useFeatureFlagState } from "@/state/featureFlags";
import { useSetting } from "@/state/settings";
import { getSchemeColors, getYearGrid } from "./widgetData";
import type { YearImages } from "./widgetData";
import {
  YEAR_BAND_ROWS,
  YEAR_MONTH_ROWS,
  YearPixelsCanvas,
} from "./YearPixelsCanvas";
import { IS_WIDGET_SUPPORTED, syncWidgets } from "./widgets";

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
 * Renders the year grid off screen, captures it as an image for the year
 * widget, then pushes every timeline. Also resyncs when the app returns to
 * the foreground, so the timeline never runs out while the app stays
 * installed.
 */
export const WidgetSync = () => {
  const { items, loaded } = useLogState();
  const scaleType = useSetting("scaleType") ?? DEFAULT_SCALE;
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
    const sync = async () => {
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
      await syncWidgets({ items, scaleType, isAvailable, yearImages });
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
  }, [items, loaded, scaleType, flagState]);

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
