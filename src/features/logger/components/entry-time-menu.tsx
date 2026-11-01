import dayjs from "dayjs";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Clock from "lucide-react-native/icons/clock";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { ENTRY_TIME_MINUTE_INTERVAL, clampToNow } from "../entry-time";
import { PILL_HEIGHT, Pill } from "./pill";
import type { EntryTimeMenuProps } from "./entry-time-menu-types";
import { getEntryTimeMenuPresets } from "./entry-time-menu-types";

/** Value format of `<input type="datetime-local">`, local time. */
const INPUT_FORMAT = "YYYY-MM-DDTHH:mm";

/**
 * Entry time menu on web: plain popover above the time pill with Morning,
 * Afternoon, Evening and the browser date and time field. iOS and Android use
 * native menus (`EntryTimeMenu.ios.tsx`, `EntryTimeMenu.android.tsx`).
 */
export const EntryTimeMenu = ({
  dateTime,
  label,
  testID,
  onChange,
}: EntryTimeMenuProps) => {
  const colors = useColors();
  const [open, setOpen] = useState(false);

  const change = (value: string) => {
    setOpen(false);
    onChange(value);
  };

  return (
    <View style={{ zIndex: 1 }}>
      <Pill
        testID={testID}
        icon={<Clock width={18} height={18} color={colors.logHeaderText} />}
        label={label}
        accessibilityLabel={label}
        accessibilityHint={t("logger_date_hint")}
        onPress={() => setOpen((value) => !value)}
      />
      {open && (
        <View
          style={{
            position: "absolute",
            bottom: PILL_HEIGHT + 8,
            left: 0,
            minWidth: 220,
            padding: 4,
            borderRadius: RADIUS.md,
            borderCurve: "continuous",
            backgroundColor: colors.bottomSheetBackground,
          }}
        >
          {getEntryTimeMenuPresets(dateTime).map((preset) => (
            <Pressable
              key={preset.id}
              accessibilityRole="menuitem"
              disabled={preset.dateTime === null}
              onPress={() => {
                if (preset.dateTime !== null) {
                  change(preset.dateTime);
                }
              }}
              style={{ padding: 12 }}
            >
              <Text
                style={{
                  color:
                    preset.dateTime === null
                      ? colors.textSecondary
                      : colors.text,
                }}
              >
                {preset.title}
              </Text>
            </Pressable>
          ))}
          <View style={{ padding: 12 }}>
            <input
              type="datetime-local"
              aria-label={t("logger_date_choose")}
              value={dayjs(dateTime).format(INPUT_FORMAT)}
              max={dayjs().format(INPUT_FORMAT)}
              step={ENTRY_TIME_MINUTE_INTERVAL * 60}
              onChange={(event) => {
                const picked = dayjs(event.target.value);
                if (picked.isValid()) {
                  change(clampToNow(picked.toDate()).toISOString());
                }
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
};
