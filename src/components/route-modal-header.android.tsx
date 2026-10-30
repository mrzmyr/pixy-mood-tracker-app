import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderButton } from "@/components/header-button";
import { getCloseLabel } from "@/components/close-label";
import useColors from "@/hooks/use-colors";
import type { RouteModalHeaderProps } from "./route-modal-header";

/** Material 3 full-screen dialog header height. */
const BAR_HEIGHT = 56;

/**
 * Material 3 full-screen dialog bar: close icon top left, left-aligned
 * title, optional text action right (`confirm`). No divider. Draws under the status
 * bar, so the screen needs no top inset of its own.
 */
const RouteModalHeader = ({
  title,
  onClose,
  closeTestID,
  titleView,
  confirm,
}: RouteModalHeaderProps) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="route-modal-header"
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: BAR_HEIGHT + insets.top,
        paddingTop: insets.top,
        paddingLeft: 6,
        paddingRight: 8,
      }}
    >
      <HeaderButton
        kind="cancel"
        label={getCloseLabel(Boolean(confirm))}
        onPress={onClose}
        testID={closeTestID}
      />
      {titleView ? (
        <View style={{ flex: 1, alignItems: "center", marginRight: 44 }}>
          {titleView}
        </View>
      ) : (
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={{
            flex: 1,
            marginLeft: 10,
            fontSize: 22,
            color: colors.text,
          }}
        >
          {title}
        </Text>
      )}
      {confirm ? (
        <HeaderButton {...confirm} kind={confirm.kind ?? "confirm"} />
      ) : null}
    </View>
  );
};

export default RouteModalHeader;
