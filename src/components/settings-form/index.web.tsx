import type { ReactElement, ReactNode } from "react";
import { ScrollView, View } from "react-native";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import MenuList from "@/components/menu-list";
import MenuListHeadline from "@/components/menu-list-headline";
import MenuListItem from "@/components/menu-list-item";
import TextInfo from "@/components/text-info";
import Toggle from "@/components/toggle";
import { Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { SPACE } from "@/constants/space";
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
export const SettingsForm = ({
  header,
  children,
}: {
  header?: ReactElement;
  children: ReactNode;
}) => {
  const colors = useColors();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ padding: SPACE.xl }}>
        <View style={{ gap: SPACE.xxl, paddingBottom: 40 }}>
          {header}
          {children}
        </View>
      </ScrollView>
    </View>
  );
};

/** Group of rows: headline, list, help text. */
export const SettingsSection = ({
  title,
  footer,
  children,
}: SettingsSectionProps) => (
  <View>
    {title ? (
      <MenuListHeadline
        style={{ marginTop: SPACE.xxxl, marginBottom: SPACE.sm }}
      >
        {title}
      </MenuListHeadline>
    ) : null}
    <MenuList>{children}</MenuList>
    {footer ? (
      <TextInfo style={{ marginTop: SPACE.sm }}>{footer}</TextInfo>
    ) : null}
  </View>
);

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
      <Label size={16} style={{ color: colors.textSecondary }}>
        {value}
      </Label>
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SPACE.sm,
            }}
          >
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
