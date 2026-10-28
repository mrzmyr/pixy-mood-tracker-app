import {
  FieldGroup,
  Host,
  RNHostView,
  Row,
  Spacer,
  Switch,
  Text,
} from "@expo/ui";
import { Children, isValidElement } from "react";
import type { ReactNode } from "react";
import { MATERIAL_SEED_COLOR } from "@/constants/colors";
import useFormBackground from "@/hooks/use-form-background";
import NavigationChevron from "./navigation-chevron";
import {
  formModifiers,
  pressableRowModifiers,
  switchProps,
  switchTitleModifiers,
  useFooterTextStyle,
  useSecondaryText,
} from "./platform";
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

const DISABLED_STYLE = { opacity: 0.5 };

const FooterText = ({ children }: { children: string }) => {
  const textStyle = useFooterTextStyle();
  return <Text textStyle={textStyle}>{children}</Text>;
};

const renderSection = ({ title, footer, children }: SettingsSectionProps) => (
  <FieldGroup.Section title={title}>
    {children}
    {footer ? (
      <FieldGroup.SectionFooter>
        <FooterText>{footer}</FooterText>
      </FieldGroup.SectionFooter>
    ) : null}
  </FieldGroup.Section>
);

/**
 * Group of rows in a `SettingsForm`. Marker only: `SettingsForm` reads its
 * props and renders the native section, so place it directly inside.
 */
export const SettingsSection = (_props: SettingsSectionProps) => null;

/**
 * Settings page as a native grouped list: SwiftUI `Form` on iOS, Material 3
 * list on Android. Fills its parent and scrolls. Web:
 * [index.web.tsx](./index.web.tsx).
 */
export const SettingsForm = ({ children }: { children: ReactNode }) => {
  const backgroundColor = useFormBackground();

  return (
    <Host style={{ flex: 1 }} seedColor={MATERIAL_SEED_COLOR}>
      <FieldGroup style={{ backgroundColor }} modifiers={formModifiers}>
        {/* Android groups rows by element type: a wrapper component would
            land inside an implicit section, so render sections here. */}
        {/* oxlint-disable-next-line react/no-react-children -- @expo/ui FieldGroup reads its direct children the same way. */}
        {Children.map(children, (child) =>
          isValidElement<SettingsSectionProps>(child) &&
          child.type === SettingsSection
            ? renderSection(child.props)
            : child
        )}
      </FieldGroup>
    </Host>
  );
};

const RowIcon = ({ icon }: { icon: SettingsSwitchProps["icon"] }) =>
  icon ? <RNHostView matchContents>{icon}</RNHostView> : null;

/** On/off row: native switch, `label` as its screen reader name. */
export const SettingsSwitch = ({
  label,
  value,
  onValueChange,
  disabled = false,
  testID,
  icon,
}: SettingsSwitchProps) => (
  <Row alignment="center" spacing={12}>
    <RowIcon icon={icon} />
    <Text
      modifiers={switchTitleModifiers}
      style={disabled ? DISABLED_STYLE : undefined}
    >
      {label}
    </Text>
    <Spacer flexible />
    <Switch
      {...switchProps(label)}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      testID={testID}
    />
  </Row>
);

/** Text row with optional status, chevron, or React Native accessory. */
export const SettingsRow = ({
  title,
  value,
  onPress,
  kind = "button",
  testID,
  icon,
  accessory,
}: SettingsRowProps) => {
  const secondary = useSecondaryText();

  return (
    <Row
      alignment="center"
      spacing={12}
      onPress={onPress}
      testID={testID}
      modifiers={onPress ? pressableRowModifiers(kind) : undefined}
    >
      <RowIcon icon={icon} />
      <Text>{title}</Text>
      <Spacer flexible />
      {value === undefined ? null : (
        <Text textStyle={secondary.textStyle} modifiers={secondary.modifiers}>
          {value}
        </Text>
      )}
      {onPress && kind === "navigation" ? <NavigationChevron /> : null}
      {accessory ? <RNHostView matchContents>{accessory}</RNHostView> : null}
    </Row>
  );
};
