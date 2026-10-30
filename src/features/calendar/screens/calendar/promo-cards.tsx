import { PromoCard } from "@/components/promo-card";
import { ANNOUNCEMENTS_URL } from "@/constants/api";
import { getLanguage, t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/feature-flags";
import { isFeatureFlag } from "@/state/feature-flags/keys";
import { useSettings } from "@/state/settings";
import React, { useEffect, useEffectEvent, useState } from "react";

import { Platform, View } from "react-native";
import useColors from "@/hooks/use-colors";
import * as WebBrowser from "expo-web-browser";
import pkg from "../../../../../package.json";
import {
  localize,
  AnnouncementsSchema,
  pickAnnouncements,
} from "./announcements";
import type { Announcement } from "./announcements";

/**
 * Shows `announcements[index]` when its flag is on, else tries the next one.
 * One component per item, so each flag check is its own hook call.
 */
const AnnouncementCard = ({
  announcements,
  index,
}: {
  announcements: Announcement[];
  index: number;
}) => {
  const analytics = useAnalytics();
  const colors = useColors();
  const announcement = announcements[index];
  const flag = announcement?.flag;
  // Unknown keys check "development", then count as off below.
  const isFlagOn = useFeatureFlag(
    flag && isFeatureFlag(flag) ? flag : "development"
  );

  if (!announcement) {
    return null;
  }
  if (flag !== undefined && (!isFeatureFlag(flag) || !isFlagOn)) {
    return <AnnouncementCard announcements={announcements} index={index + 1} />;
  }

  const language = getLanguage();
  return (
    <View
      style={{
        borderTopColor: colors.cardBorder,
        borderTopWidth: 1,
        marginTop: 24,
        paddingTop: 24,
      }}
    >
      <PromoCard
        colorName="pink"
        slug={announcement.id}
        subtitle={
          announcement.subtitle
            ? localize(announcement.subtitle, language)
            : t("new_release")
        }
        title={localize(announcement.title, language)}
        onPress={() => {
          analytics.track("calendar:promo_tapped", { card: "changelog" });
          void WebBrowser.openBrowserAsync(announcement.url);
        }}
      />
    </View>
  );
};

/**
 * Promo card under the calendar for the newest announcement from
 * {@link ANNOUNCEMENTS_URL}, hidden once dismissed. Fetched once per mount;
 * offline it is skipped silently.
 */
export const PromoCards = () => {
  const { settings } = useSettings();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Effect event: reads dismissed ids at fetch time without re-fetching on
  // settings changes. A card dismissed later hides itself in `PromoCard`.
  const pick = useEffectEvent((fetched: Announcement[]) =>
    pickAnnouncements({
      announcements: fetched,
      dismissedIds: new Set(settings.actionsDone.map((action) => action.title)),
      appVersion: pkg.version,
      platform: Platform.OS,
      now: new Date(),
    })
  );

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch(ANNOUNCEMENTS_URL, {
          signal: controller.signal,
        });
        setAnnouncements(
          pick(AnnouncementsSchema.parse(await response.json()))
        );
      } catch {
        // Announcements are optional; offline or malformed, the calendar shows none.
      }
    })();

    return () => {
      controller.abort();
    };
  }, []);

  return <AnnouncementCard announcements={announcements} index={0} />;
};
