import type { TextStyle } from "react-native";
import { Text } from "react-native";
import useColors from "@/hooks/useColors";

const MenuListHeadline = ({
  children,
  style = {},
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) => {
  const colors = useColors();

  return (
    <Text
      style={{
        fontSize: 14,
        textTransform: "uppercase",
        color: colors.textSecondary,
        padding: 0,
        borderRadius: 8,
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
