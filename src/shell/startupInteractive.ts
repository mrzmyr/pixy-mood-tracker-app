import { AppMetrics } from "expo-observe";
import { useEffect, useEffectEvent, useRef } from "react";
import { useAppLock } from "@/features/applock";
import { useAppData } from "@/features/datagate";
import { defaultNotificationResponseSource } from "@/features/notifications";
import { useSettings } from "@/state/settings";
import { getStartupEntry } from "./startupEntry";

/**
 * Marks Observe TTI once every gated store is ready. Before that, every entry
 * screen shows empty or default data. The launch splash never blocks touches,
 * so it does not count. Call once in the root shell: the first mark per
 * launch wins, so a screen-level marker would measure only that screen.
 * Calls `AppMetrics` directly: `useObserve` needs a screen once the router
 * integration is on, and the root shell is no screen.
 */
export const useStartupInteractive = () => {
  const isReady = useAppData().load.status === "ready";
  const { hasActionDone } = useSettings();
  const { isLocked } = useAppLock();
  // Read on first render, before tap handlers clear the launch response.
  const hasLaunchNotification = useRef(
    defaultNotificationResponseSource.getLastResponse() !== null
  );

  const mark = useEffectEvent(() => {
    const entry = getStartupEntry({
      hasOnboarded: hasActionDone("onboarding"),
      hasLaunchNotification: hasLaunchNotification.current,
    });
    AppMetrics.markInteractive({ params: { entry, locked: isLocked } });
  });

  useEffect(() => {
    if (isReady) {
      mark();
    }
  }, [isReady]);
};
