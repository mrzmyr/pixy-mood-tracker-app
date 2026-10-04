import { Host, Menu, Picker, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag, tint } from "@expo/ui/swift-ui/modifiers";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { CALENDAR_VIEWS, isCalendarView } from "../../../views";
import { getViewLabel } from "./types";
import type { ViewMenuProps } from "./types";

/** "View" header button. SwiftUI menu with a checkmark on the current view. */
export const ViewMenu = ({ view, onChange }: ViewMenuProps) => {
  const colors = useColors();
  return (
    <Host matchContents>
      <Menu
        testID="calendar-view-menu"
        label={t("calendar_view")}
        systemImage="calendar"
        modifiers={[tint(colors.linkButtonTextPrimary)]}
      >
        <Picker
          selection={view}
          onSelectionChange={(selection) => {
            if (isCalendarView(selection)) {
              onChange(selection);
            }
          }}
          modifiers={[pickerStyle("inline")]}
        >
          {CALENDAR_VIEWS.map((item) => (
            <Text key={item} modifiers={[tag(item)]}>
              {getViewLabel(item)}
            </Text>
          ))}
        </Picker>
      </Menu>
    </Host>
  );
};
