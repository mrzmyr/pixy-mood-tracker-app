import { Text } from "react-native";
import type { TextProps, TextStyle } from "react-native";

import useColors from "@/hooks/useColors";

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
  if (!caps) {
    return {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "400",
      letterSpacing: 0,
      color,
    };
  }

  return {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color,
  };
};

/**
 * Tab and axis labels. 12/16.
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

/** Hint under a control. 13/18. */
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
        fontSize: 13,
        lineHeight: 18,
        fontWeight: "400",
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

/** Line under a title. 15/20. */
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
        fontSize: 15,
        lineHeight: 20,
        fontWeight: "400",
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

/**
 * Body copy. Wrapped paragraphs and lists use 17/24.
 * Set `wraps` to false for a single-line row (17/22).
 */
export const Body = ({
  wraps = true,
  children,
  style,
  accessibilityRole,
  testID,
}: RoleProps & { wraps?: boolean }) => {
  const colors = useColors();
  let lineHeight = 24;

  if (!wraps) {
    lineHeight = 22;
  }

  return (
    <RoleText
      role={{
        fontSize: 17,
        lineHeight,
        fontWeight: "400",
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

/** Card and sheet title. 20/26, weight 600. */
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
        fontSize: 20,
        lineHeight: 26,
        fontWeight: "600",
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

/** Screen title. 24/30, weight 700. */
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
        fontSize: 24,
        lineHeight: 30,
        fontWeight: "700",
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

/** Onboarding headline. 32/38, weight 700. */
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
        fontSize: 32,
        lineHeight: 38,
        fontWeight: "700",
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
