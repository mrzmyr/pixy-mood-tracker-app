import { useNavigation } from "@react-navigation/native";
import { useLogState } from "@/hooks/useLogs";
import dayjs from "dayjs";
import { DATE_FORMAT } from "@/constants/Config";

/**
 * Open a calendar day: the day's entry list, or the create screen at the
 * current time of day when the day has no entries.
 */
export const useCalendarNavigation = () => {
  const navigation = useNavigation();
  const logsState = useLogState();

  const openDay = (date: string) => {
    const items = logsState.items.filter(
      (log) => dayjs(log.dateTime).format(DATE_FORMAT) === date
    );

    if (items.length === 0) {
      navigation.navigate("LogCreate", {
        dateTime: dayjs(date)
          .hour(dayjs().hour())
          .minute(dayjs().minute())
          .toISOString(),
      });
      return;
    }

    navigation.navigate("LogList", { date });
  };

  return {
    openDay,
  };
};
