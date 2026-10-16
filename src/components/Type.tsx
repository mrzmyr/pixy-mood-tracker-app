import { Text } from "react-native";
import type { TextProps, TextStyle } from "react-native";

import useColors from "@/hooks/useColors";

import { getTypeMetrics } from "./typeMetrics";

interface RoleProps {
  children: React.ReactNode;
  style?: TextStyle;
  accessibilityRole?: TextProps["accessibilityRole"];
  testID?: string;
}

const RoleText = ({
  children,
  style,
  role,
  accessibilityRole,
  testID,
}: RoleProps & { role: TextStyle }) => (
  <Text
    accessibilityRole={accessibilityRole}
    testID={testID}
    style={[role, style]}
  >
    {children}
  </Text>
);

const getMicroRole = ({
  caps,
  color,
}: {
  caps: boolean;
  color: string;
}): TextStyle => {
  const { fontSize, lineHeight, fontWeight } = getTypeMetrics().micro;

  if (!caps) {
    return { fontSize, lineHeight, fontWeight, letterSpacing: 0, color };
  }

  return {
    fontSize,
    lineHeight,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color,
  };
};

/**
 * Tab and axis labels. iOS Caption1, Android bodySmall.
 * All-caps labels use tracking 0.6 and weight 600; other roles keep tracking at 0.
 */
export const Micro = ({
  caps = false,
  children,
  style,
  accessibilityRole,
  testID,
}: RoleProps & { caps?: boolean }) => {
  const colors = useColors();

  return (
    <RoleText
      role={getMicroRole({ caps, color: colors.textSecondary })}
      style={style}
      accessibilityRole={accessibilityRole}
      testID={testID}
    >
      {children}
    </RoleText>
  );
};

/** Hint under a control. iOS Footnote, Android bodySmall. */
export const Caption = ({
  children,
  style,
  accessibilityRole,
  testID,
}: RoleProps) => {
  const colors = useColors();

  return (
    <RoleText
      role={{
        ...getTypeMetrics().caption,
        letterSpacing: 0,
        color: colors.textSecondary,
      }}
      style={style}
      accessibilityRole={accessibilityRole}
      testID={testID}
    >
      {children}
    </RoleText>
  );
};

/** Line under a title. iOS Subheadline, Android bodyMedium. */
export const Secondary = ({
  children,
  style,
  accessibilityRole,
  testID,
}: RoleProps) => {
  const colors = useColors();

  return (
    <RoleText
      role={{
        ...getTypeMetrics().secondary,
        letterSpacing: 0,
        color: colors.textSecondary,
      }}
      style={style}
      accessibilityRole={accessibilityRole}
      testID={testID}
    >
      {children}
    </RoleText>
  );
};

/** Body copy. iOS Body, Android bodyLarge. */
export const Body = ({
  children,
  style,
  accessibilityRole,
  testID,
}: RoleProps) => {
  const colors = useColors();

  return (
    <RoleText
      role={{
        ...getTypeMetrics().body,
        letterSpacing: 0,
        color: colors.text,
      }}
      style={style}
      accessibilityRole={accessibilityRole}
      testID={testID}
    >
      {children}
    </RoleText>
  );
};

/** Row title and emphasized body. iOS Headline, Android titleMedium. */
export const Headline = ({
  children,
  style,
  accessibilityRole,
  testID,
}: RoleProps) => {
  const colors = useColors();

  return (
    <RoleText
      role={{
        ...getTypeMetrics().headline,
        letterSpacing: 0,
        color: colors.text,
      }}
      style={style}
      accessibilityRole={accessibilityRole}
      testID={testID}
    >
      {children}
    </RoleText>
  );
};

/** Card and sheet title. iOS Title3, Android titleLarge. Weight 600. */
export const Section = ({
  children,
  style,
  accessibilityRole,
  testID,
}: RoleProps) => {
  const colors = useColors();

  return (
    <RoleText
      role={{
        ...getTypeMetrics().section,
        letterSpacing: 0,
        color: colors.text,
      }}
      style={style}
      accessibilityRole={accessibilityRole}
      testID={testID}
    >
      {children}
    </RoleText>
  );
};

/** Screen title. iOS Title2, Android headlineSmall. Weight 700. */
export const Title = ({
  children,
  style,
  accessibilityRole,
  testID,
}: RoleProps) => {
  const colors = useColors();

  return (
    <RoleText
      role={{
        ...getTypeMetrics().title,
        letterSpacing: 0,
        color: colors.text,
      }}
      style={style}
      accessibilityRole={accessibilityRole}
      testID={testID}
    >
      {children}
    </RoleText>
  );
};

/** Onboarding headline. iOS LargeTitle, Android displaySmall. Weight 700. */
export const Display = ({
  children,
  style,
  accessibilityRole,
  testID,
}: RoleProps) => {
  const colors = useColors();

  return (
    <RoleText
      role={{
        ...getTypeMetrics().display,
        letterSpacing: 0,
        color: colors.text,
      }}
      style={style}
      accessibilityRole={accessibilityRole}
      testID={testID}
    >
      {children}
    </RoleText>
  );
};
