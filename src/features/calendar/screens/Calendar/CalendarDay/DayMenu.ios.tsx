import dayjs from "dayjs";
import { Link } from "expo-router";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { RADIUS } from "@/constants/Radius";
import type { LogItem } from "@/features/logs";
import { useToday } from "@/hooks/useToday";
import { getItemTime } from "@/lib/logDates";
import { getRatingLabel } from "@/lib/ratingLabel";
import { t } from "@/lib/translation";
import { formatItemTime } from "@/lib/utils";
import { useDayActions } from "../../../dayActions";
import type { DayMenuProps } from "./dayMenuTypes";

const styles = StyleSheet.create({
  // iOS lifts this view on long press. Same radius as the day, so the lifted
  // day keeps its corners.
  trigger: { borderRadius: RADIUS.sm },
});

const byTime = (a: LogItem, b: LogItem) => getItemTime(a) - getItemTime(b);

/** One submenu row per entry: time as title, rating as subtitle. */
const entryAction = (
  item: LogItem,
  onPress: (entry: LogItem) => void,
  destructive?: boolean
): ReactElement => (
  <Link.MenuAction
    key={item.id}
    subtitle={getRatingLabel(item.rating)}
    destructive={destructive}
    onPress={() => onPress(item)}
  >
    {formatItemTime(item.dateTime)}
  </Link.MenuAction>
);

/**
 * Long press on a calendar day on iOS: a preview of the day view and a
 * context menu.
 *
 * - Day with entries: preview, Add Entry, Edit Entry, Delete Entry. Several
 *   entries turn Edit and Delete into submenus, one row per entry time
 * - Empty day: Add Entry only, no preview (the day view would be empty)
 * - Future day: no menu, like the disabled tap
 *
 * Tap stays with the day's own `Pressable` (`openDay`): the trigger is a
 * plain `View`, so the link press props it gets do nothing. Tapping the
 * preview opens the day view.
 */
export const DayMenu = ({ date, items, children }: DayMenuProps) => {
  const today = useToday();
  const actions = useDayActions(date, "calendar_menu");

  if (dayjs(date).isAfter(today, "day")) {
    return children;
  }

  const entries = [...items].sort(byTime);
  // `Link.Menu` drops fragments: build plain element lists.
  let entryActions: ReactElement[] = [];
  if (entries.length === 1) {
    const [item] = entries;
    entryActions = [
      <Link.MenuAction
        key="edit"
        icon="pencil"
        onPress={() => actions.handleEdit(item)}
      >
        {t("edit_entry")}
      </Link.MenuAction>,
      <Link.MenuAction
        key="delete"
        icon="trash"
        destructive
        onPress={() => actions.handleDelete(item)}
      >
        {t("delete_entry")}
      </Link.MenuAction>,
    ];
  } else if (entries.length > 1) {
    entryActions = [
      <Link.Menu key="edit" title={t("edit_entry")} icon="pencil">
        {entries.map((item) => entryAction(item, actions.handleEdit))}
      </Link.Menu>,
      <Link.Menu
        key="delete"
        title={t("delete_entry")}
        icon="trash"
        destructive
      >
        {entries.map((item) => entryAction(item, actions.handleDelete, true))}
      </Link.Menu>,
    ];
  }

  return (
    <Link href={{ pathname: "/days/[date]", params: { date } }} asChild>
      <Link.Trigger>
        <View style={styles.trigger}>{children}</View>
      </Link.Trigger>
      {entries.length > 0 && <Link.Preview />}
      <Link.Menu>
        <Link.MenuAction icon="plus" onPress={actions.handleAdd}>
          {t("add_entry")}
        </Link.MenuAction>
        {entryActions}
      </Link.Menu>
    </Link>
  );
};
