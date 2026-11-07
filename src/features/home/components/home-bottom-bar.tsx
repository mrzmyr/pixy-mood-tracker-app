import type { ComponentType } from "react";
import { Pressable, View } from "react-native";
import CalendarDays from "lucide-react-native/icons/calendar-days";
import List from "lucide-react-native/icons/list";
import Plus from "lucide-react-native/icons/plus";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { HOME_LAYOUT } from "../layout";

/** Which view the switch leads to. */
export type HomeView = "day" | "calendar";

// Measured: 18 pt glyph, about 1.8 pt stroke. Lucide draws plus on 14 of 24.
const ICON_SIZE = 30;
const ICON_STROKE = 1.5;

/**
 * Floating white circle or capsule with a hairline ring and a soft shadow,
 * like the reference. No Liquid Glass: it reads as one flat white control.
 */
const FloatingButton = ({
  icon: Icon,
  label,
  testID,
  width = HOME_LAYOUT.buttonSize,
  onPress,
}: {
  icon: ComponentType<{ size: number; color: string; strokeWidth: number }>;
  label: string;
  testID: string;
  width?: number;
  onPress: () => void;
}) => {
  const colors = useColors();
  const size = HOME_LAYOUT.buttonSize;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.calendarBackground,
        borderWidth: 1,
        borderColor: colors.homeDivider,
        boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)",
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <Icon
        size={ICON_SIZE * (width === size ? 0.8 : 1)}
        color={colors.textSecondary}
        strokeWidth={ICON_STROKE}
      />
    </Pressable>
  );
};

/**
 * Button that switches between Home (day) and Calendar. Shows where it
 * leads: the calendar icon on Home, the list icon on Calendar.
 */
export const ViewSwitchButton = ({
  target,
  onPress,
}: {
  target: HomeView;
  onPress: () => void;
}) => (
  <FloatingButton
    icon={target === "calendar" ? CalendarDays : List}
    label={target === "calendar" ? t("calendar") : t("today")}
    testID={`home-switch-${target}`}
    onPress={onPress}
  />
);

/**
 * Floating bar at the bottom of Home: add entry in the middle, switch to
 * Calendar on the right. An empty slot on the left keeps the add button
 * centered.
 */
export const HomeBottomBar = ({
  onAdd,
  onSwitchView,
}: {
  onAdd: () => void;
  onSwitchView: () => void;
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: insets.bottom + HOME_LAYOUT.buttonBottom,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: HOME_LAYOUT.listInset,
      }}
    >
      <View style={{ width: HOME_LAYOUT.buttonSize }} />
      <FloatingButton
        icon={Plus}
        label={t("add_entry")}
        testID="home-add-entry"
        width={HOME_LAYOUT.addWidth}
        onPress={onAdd}
      />
      <ViewSwitchButton target="calendar" onPress={onSwitchView} />
    </View>
  );
};
