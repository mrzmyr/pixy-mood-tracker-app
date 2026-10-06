import { Platform, Text } from "react-native";
import type { TextStyle } from "react-native";

import useColors from "@/hooks/useColors";

const DEFAULT_STYLE = {};

// iOS grouped-list header: 13pt Footnote, secondary label, casing as written.
// Android Material list subheader: 14sp, weight 500, accent color, no uppercase.
const platformStyle = (): TextStyle =>
  Platform.OS === "android"
    ? { fontSize: 14, fontWeight: "500" }
    : { fontSize: 13 };

const MenuListHeadline = ({
  children,
  style = DEFAULT_STYLE,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) => {
  const colors = useColors();

  return (
    <Text
      accessibilityRole="header"
      style={{
        ...platformStyle(),
        color: Platform.OS === "android" ? colors.tint : colors.textSecondary,
        padding: 0,
        width: "100%",
        marginTop: 32,
        paddingLeft: 16,
        marginBottom: 8,
        ...style,
      }}
    >
      {children}
    </Text>
  );
};

export default MenuListHeadline;
