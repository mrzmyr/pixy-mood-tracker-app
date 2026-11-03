import { reportError } from "@/lib/report-error";
import { Asset } from "expo-asset";
import { widgetsDirectory } from "expo-widgets";
import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, PixelRatio, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { useLogLoad, useLogState } from "@/features/logs";
import { createStructuredError } from "@/lib/errors";
import { useSetting } from "@/state/settings";
import { getYearGrid, getYearImageColors } from "./widget-data";
import type { WidgetArt, YearImages } from "./widget-data";
import {
  WIDGET_SKY_HEIGHT,
  WIDGET_SKY_SCALE,
  WIDGET_SKY_WIDTH,
  WidgetSkyCanvas,
} from "./widget-sky-canvas";
import {
  YEAR_BAND_ROWS,
  YEAR_MONTH_ROWS,
  YearPixelsCanvas,
} from "./year-pixels-canvas";
import { IS_WIDGET_SUPPORTED, syncWidgets } from "./widgets";

/** Wait for a burst of changes (import, reset) before one widget update. */
const SYNC_DEBOUNCE_MS = 400;

/** Default color scale when the setting holds an unknown key. */
const DEFAULT_SCALE = "ColorBrew-RdYlGn";

/**
 * Captures a view and moves the image into the shared widget directory.
 * Returns the `file://` URI. PNG keeps the year rows see-through; the sky
 * has no transparency, so JPEG keeps it small.
 */
const captureWidgetImage = async (
  view: View,
  name: string,
  format: "png" | "jpg",
  size?: { width: number; height: number }
) => {
  const captured = await captureRef(view, {
    format,
    quality: format === "png" ? 1 : 0.9,
    ...size,
  });
  // view-shot returns a bare path; the file system API wants a file URI.
  const from = captured.startsWith("file://") ? captured : `file://${captured}`;
  const target = `${widgetsDirectory}${name}.${format}`;
  await FileSystem.deleteAsync(target, { idempotent: true });
  await FileSystem.copyAsync({ from, to: target });
  // The source stays in view-shot's tmp folder: the file system API cannot
  // delete there, and view-shot clears it on the next launch.
  return target;
};

/** Cloud Pixy for the widgets, rendered from `CloudPixy` with transparent edges. */
const PIXY_IMAGES = {
  pixyCurious: require(`../../../assets/images/widget/cloud-pixy-curious.png`),
  pixyHappy: require(`../../../assets/images/widget/cloud-pixy-happy.png`),
};

/**
 * Copies a bundled image into the shared widget directory. A file copy keeps
 * the soft edges: view-shot would store them premultiplied, and they turn
 * dark. Returns the `file://` URI.
 */
const copyWidgetAsset = async (module: number, name: string) => {
  const [asset] = await Asset.loadAsync(module);
  if (!asset?.localUri) {
    throw createStructuredError({
      status: "widget_asset_missing",
      message: "Widget image is not on the device",
      why: `expo-asset returned no local file for ${name}`,
      fix: "Open Pixy again; widgets show no Pixy meanwhile",
    });
  }
  const target = `${widgetsDirectory}${name}.png`;
  await FileSystem.deleteAsync(target, { idempotent: true });
  await FileSystem.copyAsync({ from: asset.localUri, to: target });
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
  const { items } = useLogState();
  const loaded = useLogLoad().status === "ready";
  const scaleType = useSetting("scaleType") ?? DEFAULT_SCALE;
  // One view per captured row: [scheme][layout][row].
  const rowRefs = useRef<Record<string, View | null>>({});
  const skyRefs = useRef<Record<"light" | "dark", View | null>>({
    light: null,
    dark: null,
  });
  const [skyLoaded, setSkyLoaded] = useState({ light: false, dark: false });
  // Sky and Pixy never change with entries: prepare them once per app run.
  const [art, setArt] = useState<WidgetArt>();
  const [isSkyDone, setIsSkyDone] = useState(false);

  useEffect(() => {
    if (
      !IS_WIDGET_SUPPORTED ||
      !widgetsDirectory ||
      isSkyDone ||
      !skyLoaded.light ||
      !skyLoaded.dark
    ) {
      return;
    }
    const capture = async () => {
      const next: WidgetArt = {
        skyLight: "",
        skyDark: "",
        pixyCurious: "",
        pixyHappy: "",
      };
      try {
        const [light, dark] = await Promise.all(
          (["light", "dark"] as const).map((scheme) => {
            const view = skyRefs.current[scheme];
            if (!view) {
              throw createStructuredError({
                status: "widget_sky_view_missing",
                message: "Widget sky view is not mounted",
                why: `No ${scheme} sky view when the capture started`,
                fix: "Open Pixy again; widgets keep their last sky",
              });
            }
            // view-shot multiplies the size by the screen scale.
            const toPixels = WIDGET_SKY_SCALE / PixelRatio.get();
            return captureWidgetImage(view, `sky-${scheme}`, "jpg", {
              width: WIDGET_SKY_WIDTH * toPixels,
              height: WIDGET_SKY_HEIGHT * toPixels,
            });
          })
        );
        next.skyLight = light;
        next.skyDark = dark;
      } catch (error) {
        const structuredError = createStructuredError({
          status: "widget_sky_image_failed",
          message: "Widget sky image could not be captured",
          why: `react-native-view-shot failed: ${error instanceof Error ? error.message : String(error)}`,
          fix: "Open Pixy again; widgets show the plain sky color meanwhile",
        });
        console.error(structuredError);
        reportError(structuredError);
      }
      try {
        next.pixyCurious = await copyWidgetAsset(
          PIXY_IMAGES.pixyCurious,
          "pixy-curious"
        );
        next.pixyHappy = await copyWidgetAsset(
          PIXY_IMAGES.pixyHappy,
          "pixy-happy"
        );
      } catch (error) {
        const structuredError = createStructuredError({
          status: "widget_pixy_image_failed",
          message: "Cloud Pixy could not be copied for the widgets",
          why: error instanceof Error ? error.message : String(error),
          fix: "Open Pixy again; widgets show no Pixy meanwhile",
        });
        console.error(structuredError);
        reportError(structuredError);
      }
      setArt(next);
      setIsSkyDone(true);
    };
    void capture();
  }, [isSkyDone, skyLoaded]);

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
          return captureWidgetImage(view, `year-${name}`, "png");
        })
      );
    };
    const sync = async () => {
      let yearImages: YearImages | undefined;
      try {
        if (widgetsDirectory) {
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
        reportError(structuredError);
      }
      await syncWidgets({ items, scaleType, yearImages, art });
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
  }, [items, loaded, scaleType, art]);

  const showsSky =
    IS_WIDGET_SUPPORTED && Boolean(widgetsDirectory) && !isSkyDone;
  if (grid === null && !showsSky) {
    return null;
  }

  const yearRows =
    grid === null
      ? null
      : (["light", "dark"] as const).flatMap((scheme) =>
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
                colors={getYearImageColors(scheme, scaleType)}
              />
            ))
          )
        );

  // Behind the app content: the root view is opaque and covers it.
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", top: 0, left: 0, zIndex: -1 }}
    >
      {showsSky
        ? (["light", "dark"] as const).map((scheme) => (
            <WidgetSkyCanvas
              key={`sky-${scheme}`}
              ref={(view) => {
                skyRefs.current[scheme] = view;
              }}
              scheme={scheme}
              onReady={() =>
                setSkyLoaded((current) =>
                  current[scheme] ? current : { ...current, [scheme]: true }
                )
              }
            />
          ))
        : null}
      {yearRows}
    </View>
  );
};
