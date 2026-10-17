import { Stack } from "expo-router";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

/**
 * iOS bottom toolbar of the calendar: the native replacement for the
 * floating button, which is an Android pattern. "Today" shows away from
 * today and scrolls to the end. The prominent plus adds an entry.
 *
 * Native toolbar items have no test IDs, so e2e flows tap them by
 * accessibility label (`e2e/subflows/calendar-add-entry.yaml`).
 * Must render inside the calendar page: `Stack.Toolbar` with
 * `placement="bottom"` only works in page components.
 */
export const CalendarBottomToolbar = ({
  isAtBottom,
  hasTodayEntry,
  onScrollToBottom,
  onAdd,
}: {
  isAtBottom: boolean;
  hasTodayEntry: boolean;
  onScrollToBottom: () => void;
  onAdd: () => void;
}) => {
  const colors = useColors();

  return (
    <Stack.Toolbar placement="bottom">
      <Stack.Toolbar.Button
        icon="chevron.down"
        accessibilityLabel={t("back_to_today")}
        hidden={isAtBottom}
        onPress={onScrollToBottom}
      >
        {t("today")}
      </Stack.Toolbar.Button>
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button
        icon="plus"
        variant="prominent"
        tintColor={colors.primaryButtonBackground}
        accessibilityLabel={t(
          hasTodayEntry ? "add_today_another_entry" : "add_today_entry"
        )}
        onPress={onAdd}
      />
    </Stack.Toolbar>
  );
};
