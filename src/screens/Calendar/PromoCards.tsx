import { PromoCard } from "@/components/PromoCard";
import { MONTH_REPORT_SLUG, PromoCardMonth } from "@/components/PromoCardMonth";
import { PromoCardYear, YEAR_REPORT_SLUG } from "@/components/PromoCardYear";
import { DATE_FORMAT, STATISTIC_MIN_LOGS } from "@/constants/Config";
import { t } from "@/helpers/translation";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSettings } from "@/hooks/useSettings";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import { XMLParser } from "fast-xml-parser";
import type { ReactElement } from "react";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import useColors from "../../hooks/useColors";
import { useLogState } from "../../hooks/useLogs";
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

export const PromoCards = () => {
  const navigation = useNavigation();
  const logState = useLogState();
  const analytics = useAnalytics();
  const colors = useColors();
  const { hasActionDone } = useSettings();

  const statisticsUnlocked = logState.items.length >= STATISTIC_MIN_LOGS;
  const isBeginningOfMonth = dayjs().isBetween(
    dayjs().startOf("month"),
    dayjs().startOf("month").add(3, "day"),
    null,
    "[]"
  );
  const isDecember = dayjs().month() === 11;
  const enoughtLogsForYearPromo = logState.items.length > 30;

  const hasMonthPromo =
    isBeginningOfMonth &&
    statisticsUnlocked &&
    !hasActionDone(MONTH_REPORT_SLUG);
  const hasYearPromo =
    enoughtLogsForYearPromo &&
    isDecember &&
    statisticsUnlocked &&
    !hasActionDone(YEAR_REPORT_SLUG);
  const [mostRecentRssItem, setMostRecentRssItem] = useState<RssItem | null>(
    null
  );

  const hasMostRecentRssItem =
    !!mostRecentRssItem && !hasActionDone(mostRecentRssItem.slug);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(
          "https://pixy.featureos.app/rss/changelog.xml"
        );
        const str = await response.text();
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

        if (items.length !== 0) {
          setMostRecentRssItem(items[0]);
        }
      } catch {
        // The changelog card is optional; the calendar remains usable offline.
      }
    })();
  }, []);

  const promoCards: ReactElement[] = [];

  if (hasMonthPromo) {
    promoCards.push(
      <PromoCardMonth
        key="month"
        title={t("promo_card_month_title", {
          month: dayjs().subtract(1, "month").format("MMMM"),
        })}
        onPress={() =>
          navigation.navigate("StatisticsMonth", {
            date: dayjs()
              .subtract(1, "month")
              .startOf("month")
              .format(DATE_FORMAT),
          })
        }
      />
    );
  }

  if (hasYearPromo) {
    promoCards.push(
      <PromoCardYear
        key="year"
        title={t("promo_card_year_title", { year: dayjs().format("YYYY") })}
        onPress={() =>
          navigation.navigate("StatisticsYear", {
            date: dayjs().startOf("year").format(DATE_FORMAT),
          })
        }
      />
    );
  }

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
