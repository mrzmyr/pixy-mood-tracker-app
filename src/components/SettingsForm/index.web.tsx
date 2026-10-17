import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import FlagHighlight from "@/components/FlagHighlight";
import MenuList from "@/components/MenuList";
import MenuListHeadline from "@/components/MenuListHeadline";
import MenuListItem from "@/components/MenuListItem";
import TextInfo from "@/components/TextInfo";
import Toggle from "@/components/Toggle";
import useColors from "@/hooks/useColors";
import type {
  SettingsRowProps,
  SettingsSectionProps,
  SettingsSwitchProps,
} from "./types";

export type {
  SettingsRowProps,
  SettingsSectionProps,
  SettingsSwitchProps,
} from "./types";

/**
 * Web build of the settings form. `@expo/ui` has no web module, and
 * importing it throws at load, which blanks the whole web app. Keeps the
 * React Native `MenuList` rows.
 */
export const SettingsForm = ({ children }: { children: ReactNode }) => {
  const colors = useColors();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ padding: 20 }}>
        <View style={{ gap: 24, paddingBottom: 40 }}>{children}</View>
      </ScrollView>
    </View>
  );
};

/** Group of rows: headline, list, help text. */
export const SettingsSection = ({
  title,
  footer,
  flag,
  children,
}: SettingsSectionProps) => {
  const section = (
    <View>
      {title ? <MenuListHeadline>{title}</MenuListHeadline> : null}
      <MenuList>{children}</MenuList>
      {footer ? <TextInfo>{footer}</TextInfo> : null}
    </View>
  );

  return flag ? <FlagHighlight flag={flag}>{section}</FlagHighlight> : section;
};

/** On/off row: system switch, `label` as its screen reader name. */
export const SettingsSwitch = ({
  label,
  value,
  onValueChange,
  disabled = false,
  testID,
  icon,
}: SettingsSwitchProps) => (
  <MenuListItem
    title={label}
    iconLeft={icon ?? null}
    deactivated={disabled}
    iconRight={
      <Toggle
        accessibilityLabel={label}
        testID={testID}
        disabled={disabled}
        onValueChange={onValueChange}
        value={value}
      />
    }
  />
);

/** Text row with optional status, chevron, or accessory. */
export const SettingsRow = ({
  title,
  value,
  onPress,
  kind = "button",
  testID,
  icon,
  accessory,
}: SettingsRowProps) => {
  const colors = useColors();
  const hasChevron = onPress !== undefined && kind === "navigation";
  const status =
    value === undefined ? null : (
      <Text style={{ fontSize: 17, color: colors.textSecondary }}>{value}</Text>
    );

  return (
    <MenuListItem
      title={title}
      iconLeft={icon ?? null}
      onPress={onPress ?? null}
      testID={testID}
      iconRight={
        accessory ??
        (hasChevron ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {status}
            <ChevronRight width={18} color={colors.menuListItemIcon} />
          </View>
        ) : (
          status
        ))
      }
    />
  );
};
