import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import Button from "@/components/button";
import { InlineAlert } from "@/components/inline-alert";
import type { InlineAlertVariant } from "@/components/inline-alert";
import MenuListHeadline from "@/components/menu-list-headline";
import { Copy, Heading, Label } from "@/components/typography";
import type { CopySize, HeadingSize, LabelSize } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import type { IColors } from "@/constants/colors";
import useColors from "@/hooks/use-colors";
import useScale from "@/hooks/use-scale";
import { useSetting } from "@/state/settings";

const HEADING_SIZES = [
  72, 64, 56, 48, 40, 32, 24, 20, 16, 14,
] as const satisfies readonly HeadingSize[];
const LABEL_SIZES = [
  20, 18, 16, 14, 13, 12,
] as const satisfies readonly LabelSize[];
const COPY_SIZES = [
  24, 20, 18, 16, 14, 13,
] as const satisfies readonly CopySize[];

const BUTTON_TYPES = [
  "primary",
  "secondary",
  "tertiary",
  "contrast",
  "danger",
] as const;

const ALERT_VARIANTS = [
  "error",
  "warning",
  "info",
  "success",
] as const satisfies readonly InlineAlertVariant[];

/** Theme colors that act as roles. Component-specific keys are left out. */
const ROLE_COLORS = [
  "text",
  "textSecondary",
  "background",
  "menuListItemBackground",
  "tint",
  "danger",
] as const satisfies readonly (keyof IColors)[];

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <View style={{ gap: 8 }}>
    <MenuListHeadline style={{ marginTop: 32 }}>{title}</MenuListHeadline>
    <View style={{ gap: 12 }}>{children}</View>
  </View>
);

const Swatch = ({
  name,
  color,
  radius = RADIUS.sm,
}: {
  name: string;
  color: string;
  radius?: number;
}) => {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius,
          borderCurve: "continuous",
          backgroundColor: color,
          borderWidth: 1,
          borderColor: colors.headerBorder,
        }}
      />
      <View>
        <Label size={14} strong>
          {name}
        </Label>
        <Label size={13} style={{ color: colors.textSecondary }}>
          {color}
        </Label>
      </View>
    </View>
  );
};

/**
 * Settings > Playground > Design system: tokens and shared components in
 * every state, in the current theme.
 */
export const DevDesignSystemScreen = () => {
  const colors = useColors();
  const scale = useScale(useSetting("scaleType"));

  return (
    <ScrollView
      style={{ backgroundColor: colors.background, flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 64 }}
      testID="design-system"
    >
      <Section title="Heading">
        {HEADING_SIZES.map((size) => (
          <Heading key={size} size={size}>
            {`Heading ${size}`}
          </Heading>
        ))}
      </Section>

      <Section title="Label">
        {LABEL_SIZES.map((size) => (
          <View key={size} style={{ flexDirection: "row", gap: 12 }}>
            <Label size={size}>{`Label ${size}`}</Label>
            <Label size={size} strong>
              {`Strong ${size}`}
            </Label>
          </View>
        ))}
      </Section>

      <Section title="Copy">
        {COPY_SIZES.map((size) => (
          <Copy key={size} size={size}>
            {`Copy ${size}: text that wraps over more than one line keeps its line height.`}
          </Copy>
        ))}
      </Section>

      <Section title="Button">
        {BUTTON_TYPES.map((type) => (
          <View key={type} style={{ flexDirection: "row", gap: 12 }}>
            <Button type={type} style={{ flex: 1 }}>
              {type}
            </Button>
            <Button type={type} disabled style={{ flex: 1 }}>
              Disabled
            </Button>
          </View>
        ))}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            padding: 16,
            borderRadius: RADIUS.md,
            borderCurve: "continuous",
            backgroundColor: colors.tint,
          }}
        >
          <Button type="glass" style={{ flex: 1 }}>
            glass
          </Button>
          <Button type="primary" style={{ flex: 1 }}>
            primary
          </Button>
        </View>
      </Section>

      <Section title="InlineAlert">
        {ALERT_VARIANTS.map((variant) => (
          <InlineAlert
            key={variant}
            variant={variant}
            title={variant}
            message="Message tells the user what to do next."
          />
        ))}
      </Section>

      <Section title="Radius">
        {Object.entries(RADIUS).map(([step, value]) => (
          <Swatch
            key={step}
            name={`RADIUS.${step} (${value})`}
            color={colors.menuListItemBackground}
            radius={value}
          />
        ))}
      </Section>

      <Section title="Role colors">
        {ROLE_COLORS.map((key) => (
          <Swatch key={key} name={key} color={colors[key]} />
        ))}
      </Section>

      <Section title="Mood scale">
        {scale.labels.map((rating) => (
          <Swatch
            key={rating}
            name={rating}
            color={scale.colors[rating].background}
          />
        ))}
      </Section>
    </ScrollView>
  );
};
