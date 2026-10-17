import { useRouter } from "expo-router";
import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import MenuListItem from "@/components/MenuListItem";
import { t } from "@/lib/translation";
import dayjs from "dayjs";
import { ScrollView, View } from "react-native";
import { Moon, Star } from "react-native-feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "@/hooks/useColors";
import { useHighlightsReport } from "../../useHighlightsReport";
import { EmptyPlaceholder } from "./EmptyPlaceholder";
import { HighlightsSection } from "./HighlightsSection";

import { DATE_FORMAT } from "@/constants/Config";

/**
 * Statistics screen, opened from the calendar header.
 *
 * Unlock rule and window come from the highlights report, which follows
 * entry changes and the current day.
 */
export const StatisticsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const report = useHighlightsReport();

  return (
    <ScrollView
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
