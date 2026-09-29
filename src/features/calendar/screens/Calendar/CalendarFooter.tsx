import Button from "@/components/Button";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { useLogState } from "@/features/logs";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import { DATE_FORMAT } from "@/constants/Config";
import React from "react";
import { View } from "react-native";
import { PlusCircle } from "react-native-feather";
import { PromoCards } from "./PromoCards";
import { getItemDate } from "@/lib/logDates";
import { useAnalytics } from "@/state/analytics";

/**
 * Add-entry button under the calendar; the label changes once today has an
 * entry. New entries start at the current time.
 */
export const CalendarFooter = () => {
  const colors = useColors();
  const logState = useLogState();
  const navigation = useNavigation();
  const analytics = useAnalytics();

  const today = dayjs().format(DATE_FORMAT);
  const hasTodayItem = logState.items.some(
    (item) => getItemDate(item) === today
  );

  return (
    <View style={{}}>
      <View
        style={{
          marginTop: 24,
        }}
      >
        <View style={{}}>
          {hasTodayItem ? (
            <Button
              icon={
                <PlusCircle
                  width={24}
                  height={24}
                  color={colors.tertiaryButtonText}
                />
              }
              type="tertiary"
              onPress={() => {
                analytics.track("calendar:add_today_tapped", {
                  has_entries: hasTodayItem,
                });
                navigation.navigate("LogCreate", {
                  dateTime: dayjs().toISOString(),
                });
              }}
            >
              {t("add_today_another_entry")}
            </Button>
          ) : (
            <Button
              icon={
                <PlusCircle
                  width={24}
                  height={24}
                  color={colors.primaryButtonText}
                />
              }
              onPress={() => {
                analytics.track("calendar:add_today_tapped", {
                  has_entries: hasTodayItem,
                });
                navigation.navigate("LogCreate", {
                  dateTime: dayjs().toISOString(),
                });
              }}
            >
              {t("add_today_entry")}
            </Button>
          )}
        </View>
      </View>
      <PromoCards />
    </View>
  );
};
