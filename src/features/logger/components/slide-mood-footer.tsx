import { FLOAT_BUTTON_SIZE } from "@/constants/float-button";
import {
  LocationPicker,
  MapPinOff,
  getLocationLabel,
} from "@/features/location";
import { t } from "@/lib/translation";
import useColors from "@/hooks/use-colors";
import { getShortItemDateTitle } from "@/lib/utils";
import { useState } from "react";
import { View } from "react-native";
import MapPin from "lucide-react-native/icons/map-pin";
import { useEntryTimePicker } from "../hooks/use-entry-time-picker";
import { useLogDraft } from "../log-draft";
import { EntryTimeMenu } from "./entry-time-menu";
import { PILL_HEIGHT, Pill } from "./pill";

/**
 * Space the floating next/save button takes from the slide content: it
 * sits 32pt from the screen edge, 12pt inside the 20pt slide padding, plus
 * an 8pt gap to the pill.
 */
const FLOAT_BUTTON_SPACE = 12 + FLOAT_BUTTON_SIZE + 8;

/** Spoken name of the location button. The button itself shows only an icon. */
const getLocationText = ({
  location,
  isLocating,
}: {
  location: ReturnType<typeof useLogDraft>["draft"]["location"];
  isLocating: boolean;
}) => {
  if (location !== undefined) {
    return getLocationLabel(location);
  }
  if (isLocating) {
    return t("location_locating");
  }
  return t("location_add");
};

/**
 * Bottom row of the rating slide: entry time on the left, location on the
 * right. Must render inside `LogDraftProvider`.
 *
 * - Time: menu with Morning, Afternoon, Evening and "Choose Date & Time…",
 *   which opens the date and time picker. Changing it updates `dateTime`
 *   and `date`. The entry never moves into the future.
 * - Location: shows with `isLocationVisible` as an icon button. Pin: the
 *   entry has a place. Struck pin: none. Opens the location picker.
 * - `isActionVisible`: the floating next/save button shows. The row leaves
 *   room for it and centers on it.
 */
export const SlideMoodFooter = ({
  isLocationVisible,
  isLocating,
  isActionVisible,
}: {
  isLocationVisible: boolean;
  isLocating: boolean;
  isActionVisible: boolean;
}) => {
  const colors = useColors();
  const { draft, setDateTime, setLocation } = useLogDraft();
  const entryTimePicker = useEntryTimePicker({
    value: draft.dateTime ? new Date(draft.dateTime) : new Date(),
    onChange: (date) => setDateTime(date.toISOString()),
  });
  const [isLocationPickerVisible, setIsLocationPickerVisible] = useState(false);

  const dateTimeTitle =
    draft.dateTime === null ? "?" : getShortItemDateTitle(draft.dateTime);
  const locationText = getLocationText({
    location: draft.location,
    isLocating,
  });
  const iconProps = { width: 18, height: 18, color: colors.logHeaderText };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginRight: isActionVisible ? FLOAT_BUTTON_SPACE : 0,
        // Centers the pills on the floating button: its container pads the
        // bottom inset by 16pt, the slide by 20pt.
        marginBottom: 16 + (FLOAT_BUTTON_SIZE - PILL_HEIGHT) / 2 - 20,
      }}
    >
      <EntryTimeMenu
        testID="logger-date"
        dateTime={draft.dateTime ?? new Date().toISOString()}
        label={dateTimeTitle}
        onChange={setDateTime}
        onChoose={() => entryTimePicker.open()}
      />
      {entryTimePicker.sheet}
      {isLocationVisible && (
        <>
          <Pill
            testID="logger-location"
            icon={
              draft.location === undefined && !isLocating ? (
                <MapPinOff {...iconProps} />
              ) : (
                <MapPin {...iconProps} />
              )
            }
            accessibilityLabel={locationText}
            accessibilityHint={t("location_hint")}
            onPress={() => setIsLocationPickerVisible(true)}
          />
          <LocationPicker
            visible={isLocationPickerVisible}
            value={draft.location}
            onChange={setLocation}
            onClose={() => setIsLocationPickerVisible(false)}
          />
        </>
      )}
    </View>
  );
};
