import { Stack } from "expo-router";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

/**
 * iOS bottom toolbar of the calendar: the native replacement for the
 * floating button, which is an Android pattern. A chevron shows away
 * from today and scrolls to the end. The prominent plus adds an entry.
 *
 * Native toolbar items have no test IDs, so e2e flows tap them by
 * accessibility label (`e2e/subflows/calendar-add-entry.yaml`).
 * The label is the button title: with an icon, iOS shows only the icon
 * and reads the title. expo-router 57 drops `accessibilityLabel` on
 * toolbar items (its native setter targets the host view, not the item).
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
      {/* Mount instead of `hidden`: expo-router 57 does not show an item
          again after `hidden` turns false. */}
      {!isAtBottom && (
        <Stack.Toolbar.Button icon="chevron.down" onPress={onScrollToBottom}>
          {t("back_to_today")}
        </Stack.Toolbar.Button>
      )}
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button
        icon="plus"
        variant="prominent"
        tintColor={colors.primaryButtonBackground}
        onPress={onAdd}
      >
        {t(hasTodayEntry ? "add_today_another_entry" : "add_today_entry")}
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
};
