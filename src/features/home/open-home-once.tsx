import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useFeatureFlag } from "@/state/feature-flags";
import { getHasOpenedHome, markHomeOpened } from "./home-session";

/**
 * Calendar part of flag `day-view`: switches to Home once when the
 * flag turns on in this session. Later the user picks the view. Renders
 * nothing.
 */
export const OpenHomeOnce = () => {
  const router = useRouter();
  const isEnabled = useFeatureFlag("day-view");

  useEffect(() => {
    if (isEnabled && !getHasOpenedHome()) {
      markHomeOpened();
      router.replace("/home");
    }
  }, [isEnabled, router]);

  return null;
};
