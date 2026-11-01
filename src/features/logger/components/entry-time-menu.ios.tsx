import { Button, Divider, Host, Menu, RNHostView } from "@expo/ui/swift-ui";
import {
  accessibilityHint,
  accessibilityIdentifier,
  accessibilityLabel,
  buttonStyle,
  disabled,
} from "@expo/ui/swift-ui/modifiers";
import Clock from "lucide-react-native/icons/clock";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import type { EntryTimePreset } from "../entry-time";
import { PillFace } from "./pill";
import type { EntryTimeMenuProps } from "./entry-time-menu-types";
import { getEntryTimeMenuPresets } from "./entry-time-menu-types";

const PRESET_SYMBOLS = {
  morning: "sunrise",
  afternoon: "sun.max",
  evening: "moon",
} as const satisfies Record<EntryTimePreset, string>;

/**
 * Entry time menu on iOS: native SwiftUI `Menu` on the time pill. Morning,
 * Afternoon, Evening set the time on the entry day. Presets in the future are
 * disabled. "Choose Date & Time…" opens the full picker.
 *
 * The pill is a React Native label (`RNHostView`). The `Menu` owns tap,
 * accessibility, and the test id, so the label hides from VoiceOver.
 */
export const EntryTimeMenu = ({
  dateTime,
  label,
  testID,
  onChange,
  onChoose,
}: EntryTimeMenuProps) => {
  const colors = useColors();

  return (
    <Host matchContents ignoreSafeArea="all">
      <Menu
        label={
          <RNHostView matchContents>
            <PillFace
              icon={
                <Clock width={18} height={18} color={colors.logHeaderText} />
              }
              label={label}
            />
          </RNHostView>
        }
        modifiers={[
          buttonStyle("plain"),
          accessibilityLabel(label),
          accessibilityHint(t("logger_date_hint")),
          accessibilityIdentifier(testID),
        ]}
      >
        {getEntryTimeMenuPresets(dateTime).map((preset) => (
          <Button
            key={preset.id}
            label={preset.title}
            systemImage={PRESET_SYMBOLS[preset.id]}
            modifiers={preset.dateTime === null ? [disabled(true)] : undefined}
            onPress={() => {
              if (preset.dateTime !== null) {
                onChange(preset.dateTime);
              }
            }}
          />
        ))}
        <Divider />
        <Button
          label={t("logger_date_choose")}
          systemImage="calendar"
          onPress={onChoose}
        />
      </Menu>
    </Host>
  );
};
