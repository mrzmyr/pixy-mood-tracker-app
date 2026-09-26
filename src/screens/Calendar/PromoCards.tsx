import { PromoCard } from "@/components/PromoCard";
import { SERVICE_MOCKS } from "@/constants/Services";
import { t } from "@/helpers/translation";
import { useAnalytics } from "@/state/analytics";
import { useSettings } from "@/state/settings";
import dayjs from "dayjs";
import { XMLParser } from "fast-xml-parser";
import type { ReactElement } from "react";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import useColors from "../../hooks/useColors";
import * as WebBrowser from "expo-web-browser";

interface RssItem {
  title: string;
  id: string;
  published: string;
  slug: string;
}

interface ParsedRssItem {
  title: string;
  link: string;
  guid?: string;
  pubDate: string;
}

const isParsedRssItem = (
  item: Partial<ParsedRssItem> | undefined
): item is ParsedRssItem => !!item?.title && !!item?.link && !!item?.pubDate;

const rssParser = new XMLParser({
  ignoreAttributes: false,
  processEntities: false,
  trimValues: true,
});

// Parses changelog entries published after the changelog card was introduced.
const parseChangelogItems = (str: string): RssItem[] => {
  const parsed = rssParser.parse(str);
  const rawItems = parsed?.rss?.channel?.item;
  const items: RssItem[] = (
    Array.isArray(rawItems) ? rawItems : [rawItems]
  ).flatMap((item) =>
    isParsedRssItem(item) && dayjs(item.pubDate).isAfter("2023-01-09")
      ? [
          {
            title: item.title,
            id: item.guid || item.link,
            published: item.pubDate,
            // Explicit ASCII ranges instead of `i`: with `u`, `i` would also
            // fold non-ASCII letters and change existing slugs.
            slug: (item.guid || item.link)
              .replaceAll(/[^a-zA-Z0-9]/gu, "_")
              .toLowerCase(),
          },
        ]
      : []
  );

  return items;
};

/**
 * Promo card under the calendar for the latest changelog post, hidden once
 * dismissed. The changelog feed is fetched once per mount; offline it is
 * skipped silently.
 */
export const PromoCards = () => {
  const analytics = useAnalytics();
  const colors = useColors();
  const { hasActionDone } = useSettings();

  const [mostRecentRssItem, setMostRecentRssItem] = useState<RssItem | null>(
    null
  );

  const hasMostRecentRssItem =
    !!mostRecentRssItem && !hasActionDone(mostRecentRssItem.slug);

  useEffect(() => {
    // Mocked builds stay offline; the changelog card is optional.
    if (SERVICE_MOCKS) {
      return;
    }
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch(
          "https://pixy.featureos.app/rss/changelog.xml",
          { signal: controller.signal }
        );
        const items = parseChangelogItems(await response.text());

        if (items.length !== 0) {
          setMostRecentRssItem(items[0]);
        }
      } catch {
        // The changelog card is optional; the calendar remains usable offline.
      }
    })();

    return () => {
      controller.abort();
    };
  }, []);

  const promoCards: ReactElement[] = [];

  if (hasMostRecentRssItem) {
    promoCards.push(
      <PromoCard
        key="changelog"
        colorName="pink"
        slug={mostRecentRssItem.slug}
        subtitle={t("new_release")}
        title={mostRecentRssItem.title}
        onPress={() => {
          analytics.track("promo_changelog_clicked");
          WebBrowser.openBrowserAsync(mostRecentRssItem.id);
        }}
      />
    );
  }

  if (promoCards.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        borderTopColor: colors.cardBorder,
        borderTopWidth: 1,
        marginTop: 24,
        paddingTop: 24,
      }}
    >
      {promoCards.map((promoCard, index) => (
        <View
          key={`promo-card-${promoCard.key}`}
          style={{
            marginTop: index === 0 ? 0 : 16,
          }}
        >
          {promoCard}
        </View>
      ))}
    </View>
  );
};
