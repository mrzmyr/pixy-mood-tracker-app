import { useEffect } from "react";
import { AppState } from "react-native";
import { useLogState } from "@/features/logs";
import { useSetting } from "@/state/settings";
import { IS_WIDGET_SUPPORTED, syncWidgets } from "./widgets";

/** Wait for a burst of changes (import, reset) before one widget update. */
const SYNC_DEBOUNCE_MS = 400;

/**
 * Keeps the home screen widgets in sync with entries and the color scale.
 * Also resyncs when the app returns to the foreground, so the widget timeline
 * never runs out while the app stays installed. Renders nothing.
 */
export const WidgetSync = () => {
  const { items, loaded } = useLogState();
  const scaleType = useSetting("scaleType");

  useEffect(() => {
    if (!IS_WIDGET_SUPPORTED || !loaded) {
      return;
    }
    const sync = () => {
      void syncWidgets({ items, scaleType });
    };
    const timeout = setTimeout(sync, SYNC_DEBOUNCE_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        sync();
      }
    });
    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, [items, loaded, scaleType]);

  return null;
};
