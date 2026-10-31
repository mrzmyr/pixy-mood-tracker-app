import { useRouter } from "expo-router";
import MenuList from "@/components/menu-list";
import MenuListHeadline from "@/components/menu-list-headline";
import MenuListItem from "@/components/menu-list-item";
import { t } from "@/lib/translation";
import dayjs from "dayjs";
import { Platform, ScrollView, View } from "react-native";
import CalendarDays from "lucide-react-native/icons/calendar-days";
import Star from "lucide-react-native/icons/star";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "@/hooks/use-colors";
import { useHighlightsReport } from "../../use-highlights-report";
import { EmptyPlaceholder } from "./empty-placeholder";
import { HighlightsSection } from "./highlights-section";

import { DATE_FORMAT } from "@/constants/config";

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
      contentInsetAdjustmentBehavior="automatic"
      style={{
        backgroundColor: colors.statisticsBackground,
      }}
    >
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 20,
          // iOS adds the bottom safe area through
          // `contentInsetAdjustmentBehavior`.
          paddingBottom: (Platform.OS === "ios" ? 0 : insets.bottom) + 20,
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
                  <CalendarDays
                    width={18}
                    // Stroke icon: a fill in the stroke color hides its grid.
                    fill="none"
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
