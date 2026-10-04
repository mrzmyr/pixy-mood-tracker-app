import { useFocusEffect, useRouter } from "expo-router";
import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import MenuListItem from "@/components/MenuListItem";
import { t } from "@/lib/translation";
import dayjs from "dayjs";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { Moon, Star } from "react-native-feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "@/hooks/useColors";
import { useStatistics } from "../../StatisticsProvider";
import { EmptyPlaceholder } from "./EmptyPlaceholder";
import { HighlightsSection } from "./HighlightsSection";

import { DATE_FORMAT } from "@/constants/Config";

/**
 * Statistics screen, opened from the calendar header.
 *
 * Unlock rule and window come from the highlights report. Statistics
 * refresh when the screen gains focus.
 */
export const StatisticsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const statistics = useStatistics();
  const { report } = statistics;

  const { refresh } = statistics;

  // Runs on every focus, including the first. While focused, it runs again
  // when `refresh` changes; an unchanged report makes that a no-op.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  if (statistics.isLoading || report === null) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          marginTop: 32,
        }}
      >
        <ActivityIndicator color={colors.loadingIndicator} />
      </View>
    );
  }

  return (
    <ScrollView
      refreshControl={
        Platform.OS === "web" ? undefined : (
          <RefreshControl
            // Loading replaces this view with a spinner, so it never shows
            // as refreshing.
            refreshing={false}
            onRefresh={() => {
              statistics.refresh({ force: true });
            }}
          />
        )
      }
      style={{
        backgroundColor: colors.statisticsBackground,
      }}
    >
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: insets.bottom + 20,
        }}
      >
        {!report.unlocked && <EmptyPlaceholder count={report.missingEntries} />}

        {report.unlocked && <HighlightsSection report={report} />}

        {report.unlocked && (
          <>
            <MenuListHeadline>{t("more_statistics")}</MenuListHeadline>
            <MenuList style={{}}>
              <MenuListItem
                title={t("month_report")}
                onPress={() =>
                  router.push({
                    pathname: "/statistics/month/[date]",
                    params: {
                      date: dayjs().startOf("month").format(DATE_FORMAT),
                    },
                  })
                }
                iconLeft={
                  <Moon
                    width={18}
                    fill={colors.palette.indigo[500]}
                    color={colors.palette.indigo[500]}
                  />
                }
                isLink
              />
              <MenuListItem
                title={t("year_report")}
                onPress={() =>
                  router.push({
                    pathname: "/statistics/year/[date]",
                    params: {
                      date: dayjs().startOf("year").format(DATE_FORMAT),
                    },
                  })
                }
                iconLeft={
                  <Star
                    width={18}
                    fill={colors.palette.amber[500]}
                    color={colors.palette.amber[500]}
                  />
                }
                isLink
              />
            </MenuList>
          </>
        )}
      </View>
    </ScrollView>
  );
};
