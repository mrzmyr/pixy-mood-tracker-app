import { PostHog, PostHogProvider } from "posthog-react-native";
import { useMemo } from "react";
import { POSTHOG_API_KEY } from "@/constants/api";
import { TRACKING_ENABLED } from "@/constants/config";
import { POSTHOG_OPTIONS } from "@/shell/posthog-options";
import { useSettings, useSettingsLoad } from "@/state/settings";

/**
 * PostHog with a client that makes no requests until stored settings load
 * with analytics consent on. An opted-out client still fetches remote config
 * at start; only `disabled` stops that, and it is fixed at creation. So the
 * client is created again when consent changes.
 */
export const ConsentPostHogProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const isReady = useSettingsLoad().status === "ready";
  const { settings } = useSettings();
  const isAllowed = TRACKING_ENABLED && isReady && settings.analyticsEnabled;
  const client = useMemo(
    () =>
      new PostHog(POSTHOG_API_KEY, {
        ...POSTHOG_OPTIONS,
        disabled: !isAllowed,
      }),
    [isAllowed]
  );

  return (
    <PostHogProvider client={client} autocapture={false}>
      {children}
    </PostHogProvider>
  );
};
