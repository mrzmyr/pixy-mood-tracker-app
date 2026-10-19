import {
  DropdownMenu,
  DropdownMenuItem,
  Host,
  HorizontalDivider,
  RNHostView,
  Text,
} from "@expo/ui/jetpack-compose";
import { useState } from "react";
import Clock from "lucide-react-native/icons/clock";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { Pill } from "./pill";
import type { EntryTimeMenuProps } from "./entry-time-menu-types";
import { getEntryTimeMenuPresets } from "./entry-time-menu-types";

/**
 * Entry time menu on Android: Material 3 dropdown anchored to the time pill.
 * Morning, Afternoon, Evening set the time on the entry day. Presets in the
 * future are disabled. "Choose Date & Time…" opens the date and time dialogs.
 *
 * Compose views must be direct children of a `Host`, so the tree is
 * `Host > DropdownMenu > RNHostView > Pill`, like the entry "⋮" menu.
 */
export const EntryTimeMenu = ({
  dateTime,
  label,
  testID,
  onChange,
  onChoose,
}: EntryTimeMenuProps) => {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  const choose = (action: () => void) => () => {
    setExpanded(false);
    action();
  };

  return (
    <Host matchContents>
      <DropdownMenu
        expanded={expanded}
        onDismissRequest={() => setExpanded(false)}
        color={colors.bottomSheetBackground}
      >
        <DropdownMenu.Trigger>
          <RNHostView matchContents>
            <Pill
              testID={testID}
              icon={
                <Clock width={18} height={18} color={colors.logHeaderText} />
              }
              label={label}
              accessibilityLabel={label}
              accessibilityHint={t("logger_date_hint")}
              onPress={() => setExpanded(true)}
            />
          </RNHostView>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {getEntryTimeMenuPresets(dateTime).map((preset) => (
            <DropdownMenuItem
              key={preset.id}
              enabled={preset.dateTime !== null}
              onClick={choose(() => {
                if (preset.dateTime !== null) {
                  onChange(preset.dateTime);
                }
              })}
            >
              <DropdownMenuItem.Text>
                <Text>{preset.title}</Text>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          ))}
          <HorizontalDivider />
          <DropdownMenuItem onClick={choose(onChoose)}>
            <DropdownMenuItem.Text>
              <Text>{t("logger_date_choose")}</Text>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
};
