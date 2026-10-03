import { BottomSheet, RNHostView } from "@expo/ui";
import dayjs from "dayjs";
import { useCalendars } from "expo-localization";
import { useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { Calendar, Check } from "react-native-feather";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import TextInfo from "@/components/TextInfo";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { t } from "@/lib/translation";
import { getWeekStart } from "@/lib/weekStart";
import type { WeekStart } from "@/lib/weekStart";
import { useSettings } from "@/state/settings";

/** Native choice sheet saves immediately; dismissing preserves current choice. */
export const WeekStartSetting = () => {
  const { settings, setSettings } = useSettings();
  const [{ firstWeekday }] = useCalendars();
  const colors = useColors();
  const haptics = useHaptics();
  const [isPresented, setIsPresented] = useState(false);
  const systemDay = getWeekStart({ preference: "system", firstWeekday });
  const options: { value: WeekStart; label: string }[] = [
    {
      value: "system",
      label: `${t("week_start_system")} (${dayjs().day(systemDay).format("dddd")})`,
    },
    { value: "monday", label: dayjs().day(1).format("dddd") },
    { value: "sunday", label: dayjs().day(0).format("dddd") },
  ];
  const selected = options.find(
    (option) => option.value === settings.weekStart
  );
  const close = () => setIsPresented(false);
  const body = (
    <ScrollView
      contentContainerStyle={{
        padding: 20,
        backgroundColor: colors.bottomSheetBackground,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{
          fontSize: 22,
          fontWeight: "600",
          color: colors.text,
          marginBottom: 16,
        }}
      >
        {t("week_start")}
      </Text>
      <MenuList>
        {options.map(({ value, label }, index) => (
          <Pressable
            key={value}
            testID={`week-start-${value}`}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: settings.weekStart === value }}
            onPress={() => {
              void haptics.selection();
              setSettings((current) => ({ ...current, weekStart: value }));
              close();
            }}
            style={({ pressed }) => ({
              minHeight: 50,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              borderBottomWidth: index === options.length - 1 ? 0 : 1,
              borderBottomColor: colors.menuListItemBorder,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ flex: 1, fontSize: 17, color: colors.text }}>
              {label}
            </Text>
            {settings.weekStart === value && (
              <Check width={18} color={colors.text} />
            )}
          </Pressable>
        ))}
      </MenuList>
      <TextInfo>{t("week_start_help")}</TextInfo>
      <MenuListItem
        title={t("cancel")}
        onPress={close}
        testID="week-start-cancel"
        isLast
      />
    </ScrollView>
  );

  return (
    <>
      <MenuListItem
        title={t("week_start")}
        iconLeft={<Calendar width={18} color={colors.menuListItemIcon} />}
        onPress={() => setIsPresented(true)}
        testID="week-start"
      >
        <Text style={{ color: colors.textSecondary, textAlign: "right" }}>
          {selected?.label}
        </Text>
      </MenuListItem>
      <BottomSheet
        isPresented={isPresented}
        onDismiss={close}
        snapPoints={["half", "full"]}
        containerColor={colors.bottomSheetBackground}
        contentPadding={0}
      >
        <RNHostView>{body}</RNHostView>
      </BottomSheet>
    </>
  );
};
