import { Platform, Text } from "react-native";
import type { TextStyle } from "react-native";

import { LIST_INSET } from "@/components/list-inset";
import type { ListTextStyle } from "@/components/list-inset";
import { getTextStyle } from "@/components/typography";
import useColors from "@/hooks/use-colors";

const DEFAULT_STYLE = {};

// iOS grouped-list header: Label 13 (Footnote), secondary label, casing as written.
// Android Material list subheader: 14sp, weight 500, accent color, no uppercase.
const platformStyle = (): TextStyle =>
  Platform.OS === "android"
    ? { fontSize: 14, fontWeight: "500" }
    : getTextStyle("label", 13);

/** Title above a `MenuList` or a field. Starts at the row text, `LIST_INSET`. */
const MenuListHeadline = ({
  children,
  nativeID,
  style = DEFAULT_STYLE,
}: {
  children: React.ReactNode;
  /** Lets an input name this headline with `accessibilityLabelledBy`. */
  nativeID?: string;
  style?: ListTextStyle;
}) => {
  const colors = useColors();

  return (
    <Text
      accessibilityRole="header"
      nativeID={nativeID}
      style={{
        ...platformStyle(),
        color: Platform.OS === "android" ? colors.tint : colors.textSecondary,
        padding: 0,
        width: "100%",
        paddingLeft: LIST_INSET,
        ...style,
      }}
    >
      {children}
    </Text>
  );
};

export default MenuListHeadline;
