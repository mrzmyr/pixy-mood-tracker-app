import { ScrollView, Text, View } from "react-native";
import type { TextStyle } from "react-native";
import useColors from "@/hooks/useColors";
import type { Role } from "@/dev/type/scale";

/** Room for a gap label sitting to the right of the measured column. */
const MARK = 36;

const getRoleStyle = ({
  role,
  color,
}: {
  role: Role;
  color: string;
}): TextStyle => ({
  color,
  fontSize: role.fontSize,
  fontWeight: role.fontWeight,
  letterSpacing: role.letterSpacing,
  lineHeight: role.lineHeight,
});

/** Scroll page shared by every type-guide screen. */
export const GuidePage = ({ children }: { children: React.ReactNode }) => {
  const colors = useColors();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background, flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
    >
      {children}
    </ScrollView>
  );
};

/** One-line explanation at the top of a guide screen. */
export const Intro = ({ children }: { children: string }) => {
  const colors = useColors();

  return (
    <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 20 }}>
      {children}
    </Text>
  );
};

/** Card around one case, so the specimen sits on a surface. */
export const Case = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        marginTop: 16,
        padding: 16,
      }}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 12,
          fontWeight: "600",
          lineHeight: 16,
          marginBottom: 12,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
};

/** Specimen rendered at a role. */
export const RoleText = ({
  role,
  children,
}: {
  role: Role;
  children: string;
}) => {
  const colors = useColors();

  return (
    <Text style={getRoleStyle({ color: colors.text, role })}>{children}</Text>
  );
};

/** Secondary line under a specimen. Chrome, not a role. */
export const Spec = ({ children }: { children: string }) => {
  const colors = useColors();

  return (
    <Text
      style={{
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 16,
        marginTop: 4,
      }}
    >
      {children}
    </Text>
  );
};

/**
 * Column that reserves a right gutter.
 * {@link Gap} draws its number in that gutter.
 */
export const Measured = ({ children }: { children: React.ReactNode }) => (
  <View style={{ paddingRight: MARK }}>{children}</View>
);

/** Empty band whose height is the gap, with the point size in the gutter. */
export const Gap = ({ size }: { size: number }) => {
  const colors = useColors();
  const labelHeight = 16;

  return (
    <View
      style={{
        backgroundColor: colors.logHeaderHighlight,
        borderLeftColor: colors.tint,
        borderLeftWidth: 2,
        height: size,
      }}
    >
      <Text
        style={{
          color: colors.tint,
          fontSize: 12,
          lineHeight: labelHeight,
          position: "absolute",
          right: -MARK,
          textAlign: "right",
          top: (size - labelHeight) / 2,
          width: MARK - 4,
        }}
      >
        {size}
      </Text>
    </View>
  );
};
