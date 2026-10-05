import Button from "@/components/Button";
import { FLOAT_BUTTON_SIZE } from "@/constants/FloatButton";
import { LocationPicker, getLocationLabel } from "@/features/location";
import { locale, t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { getShortItemDateTitle } from "@/lib/utils";
import dayjs from "dayjs";
import type { ReactElement } from "react";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Clock, MapPin } from "react-native-feather";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useLogDraft } from "../logDraft";

/** Height of a pill. Matches the 44pt minimum hit target. */
const PILL_HEIGHT = 44;

/**
 * Space the floating next/save button takes from the slide content: it
 * sits 32pt from the screen edge, 12pt inside the 20pt slide padding, plus
 * an 8pt gap to the pill.
 */
const FLOAT_BUTTON_SPACE = 12 + FLOAT_BUTTON_SIZE + 8;

const DatePickerHeader = ({ onChange }: { onChange: (date: Date) => void }) => {
  const colors = useColors();
  const { draft } = useLogDraft();

  return (
    <View
      style={{
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 16,
      }}
    >
      {(
        [
          ["morning", 8],
          ["afternoon", 13],
          ["evening", 20],
        ] as const
      ).map(([label, hour], index, all) => (
        <Button
          key={label}
          type="tertiary"
          onPress={() => {
            onChange(dayjs(draft.dateTime).hour(hour).minute(0).toDate());
          }}
          style={{
            width: "100%",
            maxWidth: 240,
            padding: 12,
            marginBottom: index === all.length - 1 ? 0 : 8,
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 17, color: colors.tertiaryButtonText }}>
            {t(label)}
          </Text>
        </Button>
      ))}
    </View>
  );
};

/** Rounded button with an icon and one line of text. */
const Pill = ({
  icon,
  label,
  accessibilityLabel,
  accessibilityHint,
  testID,
  isShrinkable,
  onPress,
}: {
  icon: ReactElement;
  label: string;
  accessibilityLabel: string;
  accessibilityHint: string;
  testID: string;
  /** Truncates the label when the row runs out of space. */
  isShrinkable: boolean;
  onPress: () => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minHeight: PILL_HEIGHT,
        flexShrink: isShrinkable ? 1 : 0,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: colors.logHeaderHighlight,
        borderRadius: 8,
      })}
    >
      {icon}
      <Text
        numberOfLines={1}
        style={{
          fontSize: 17,
          fontWeight: "600",
          color: colors.logHeaderText,
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

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
 * - Time: opens the date and time picker. Changing it updates `dateTime`
 *   and `date`.
 * - Location: shows with `isLocationVisible`. Opens the location picker.
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
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
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
      {Platform.OS !== "web" && (
        <DateTimePickerModal
          // oxlint-disable-next-line react/no-unstable-nested-components -- react-native-modal-datetime-picker renders customHeaderIOS without props, so the header must close over this render's picker state setter.
          customHeaderIOS={() => (
            <DatePickerHeader
              onChange={(date) => {
                setIsDatePickerVisible(false);
                setDateTime(date.toISOString());
              }}
            />
          )}
          isVisible={isDatePickerVisible}
          locale={locale}
          date={draft.dateTime ? new Date(draft.dateTime) : new Date()}
          mode="datetime"
          minuteInterval={10}
          onConfirm={(date) => {
            setIsDatePickerVisible(false);
            setDateTime(date.toISOString());
          }}
          onCancel={() => setIsDatePickerVisible(false)}
        />
      )}
      <Pill
        testID="logger-date"
        isShrinkable={false}
        icon={<Clock {...iconProps} />}
        label={dateTimeTitle}
        accessibilityLabel={dateTimeTitle}
        accessibilityHint={t("logger_date_hint")}
        onPress={() => setIsDatePickerVisible(true)}
      />
      {isLocationVisible && (
        <>
          <Pill
            testID="logger-location"
            isShrinkable
            icon={<MapPin {...iconProps} />}
            label={locationText}
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
