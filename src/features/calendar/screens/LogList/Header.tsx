import { Platform, Text, View } from "react-native";
import { CloseButton } from "@/components/CloseButton";
import useColors from "@/hooks/useColors";

/**
 * Modal header of the day entry list with the day title and close action.
 * iOS puts close on the right. Android follows the Material 3 full-screen
 * dialog: close on the left, title after it.
 */
export const Header = ({
  title,
  onClose,
}: {
  title: string;
  onClose?: () => void;
}) => {
  const colors = useColors();
  const closeLeft = Platform.OS === "android";

  const close = (
    <View
      style={{
        alignItems: closeLeft ? "flex-start" : "flex-end",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-evenly",
          [closeLeft ? "marginLeft" : "marginRight"]: -8,
        }}
      >
        <CloseButton testID="log-list-close" onPress={() => onClose?.()} />
      </View>
    </View>
  );

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 8,
        paddingHorizontal: 16,
        marginBottom: 8,
      }}
    >
      {closeLeft ? close : null}
      <View
        style={{
          flex: 1,
          alignItems: "flex-start",
          justifyContent: "center",
          ...(closeLeft ? { marginLeft: 16 } : null),
        }}
      >
        <View
          style={{
            flexDirection: "row",
          }}
        >
          <Text
            accessibilityRole="header"
            style={{
              fontSize: 17,
              fontWeight: "600",
              color: colors.text,
            }}
          >
            {title}
          </Text>
        </View>
      </View>
      {closeLeft ? null : close}
    </View>
  );
};
