import * as Sentry from "@sentry/react-native";
import { widgetsDirectory } from "expo-widgets";
import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useMemo, useRef } from "react";
import { AppState, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { useLogState } from "@/features/logs";
import { createStructuredError } from "@/lib/errors";
import { useSetting } from "@/state/settings";
import { getSchemeColors, getYearGrid } from "./widgetData";
import type { YearImages } from "./widgetData";
import { YearPixelsCanvas } from "./YearPixelsCanvas";
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
 * Keeps the home screen widgets in sync with entries and the color scale.
 * Renders the year grid off screen, captures it as an image for the year
 * widget, then pushes every timeline. Also resyncs when the app returns to
 * the foreground, so the timeline never runs out while the app stays
 * installed.
 */
export const WidgetSync = () => {
  const { items, loaded } = useLogState();
  const scaleType = useSetting("scaleType") ?? DEFAULT_SCALE;
  const lightRef = useRef<View>(null);
  const darkRef = useRef<View>(null);
  const lightLargeRef = useRef<View>(null);
  const darkLargeRef = useRef<View>(null);

  const grid = useMemo(
    () =>
      IS_WIDGET_SUPPORTED && loaded
        ? getYearGrid({ items, scaleType, url: "" })
        : null,
    [items, loaded, scaleType]
  );

  useEffect(() => {
    if (!IS_WIDGET_SUPPORTED || !loaded) {
      return;
    }
    const sync = async () => {
      let yearImages: YearImages | undefined;
      try {
        if (
          lightRef.current &&
          darkRef.current &&
          lightLargeRef.current &&
          darkLargeRef.current &&
          widgetsDirectory
        ) {
          yearImages = {
            light: await captureYearImage(lightRef.current, "light"),
            dark: await captureYearImage(darkRef.current, "dark"),
            lightLarge: await captureYearImage(
              lightLargeRef.current,
              "light-large"
            ),
            darkLarge: await captureYearImage(
              darkLargeRef.current,
              "dark-large"
            ),
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
      await syncWidgets({ items, scaleType, yearImages });
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
  }, [items, loaded, scaleType]);

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
      <YearPixelsCanvas
        ref={lightRef}
        grid={grid}
        bands={1}
        colors={getSchemeColors("light", scaleType)}
      />
      <YearPixelsCanvas
        ref={darkRef}
        grid={grid}
        bands={1}
        colors={getSchemeColors("dark", scaleType)}
      />
      <YearPixelsCanvas
        ref={lightLargeRef}
        grid={grid}
        bands={2}
        colors={getSchemeColors("light", scaleType)}
      />
      <YearPixelsCanvas
        ref={darkLargeRef}
        grid={grid}
        bands={2}
        colors={getSchemeColors("dark", scaleType)}
      />
    </View>
  );
};
