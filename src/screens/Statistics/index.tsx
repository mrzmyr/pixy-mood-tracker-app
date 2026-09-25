import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import MenuListItem from "@/components/MenuListItem";
import { t } from "@/helpers/translation";
import dayjs from "dayjs";
import { useEffect, useEffectEvent } from "react";
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
import { useLogState } from "@/hooks/useLogs";
import { useStatistics } from "@/hooks/useStatistics";
import { EmptyPlaceholder } from "./EmptyPlaceholder";
import { HighlightsSection } from "./HighlightsSection";

import { DATE_FORMAT, STATISTIC_MIN_LOGS } from "@/constants/Config";
import isBetween from "dayjs/plugin/isBetween";
import type { RootStackScreenProps } from "../../../types";
import { getItemTime } from "@/lib/logDates";

dayjs.extend(isBetween);

/**
 * Statistics tab.
 *
 * Unlocks with {@link STATISTIC_MIN_LOGS} entries in the last 14 days, not
 * in total. Statistics reload when the tab gains focus.
 */
export const StatisticsScreen = ({
  navigation,
}: Pick<RootStackScreenProps<"Statistics">, "navigation">) => {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const statistics = useStatistics();
  const logState = useLogState();

  // times of the last two weeks
  const periodEnd = dayjs().valueOf();
  const periodStart = dayjs().subtract(14, "day").valueOf();
  const items = logState.items.filter((item) => {
    const time = getItemTime(item);
    return time >= periodStart && time <= periodEnd;
  });

  const statisticsUnlocked = items.length >= STATISTIC_MIN_LOGS;

  // Effect event: the focus listener reads the latest items and statistics
  // without re-subscribing whenever they change.
  const onFocus = useEffectEvent(() => {
    if (items.length >= STATISTIC_MIN_LOGS) {
      statistics.load({
        force: false,
      });
    }
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      onFocus();
    });

    return unsubscribe;
  }, [navigation]);

  if (statistics.isLoading) {
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
              if (items.length >= STATISTIC_MIN_LOGS) {
                statistics.load({
                  force: true,
                });
              }
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
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
        }}
      >
        {items.length < STATISTIC_MIN_LOGS && (
          <EmptyPlaceholder count={STATISTIC_MIN_LOGS - items.length} />
        )}

        {statisticsUnlocked && <HighlightsSection items={items} />}

        {statisticsUnlocked && (
          <>
            <MenuListHeadline>{t("more_statistics")}</MenuListHeadline>
            <MenuList style={{}}>
              <MenuListItem
                title={t("month_report")}
                onPress={() =>
                  navigation.navigate("StatisticsMonth", {
                    date: dayjs().startOf("month").format(DATE_FORMAT),
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
                  navigation.navigate("StatisticsYear", {
                    date: dayjs().startOf("year").format(DATE_FORMAT),
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
                isLast
              />
            </MenuList>
          </>
        )}
      </View>
    </ScrollView>
  );
};
