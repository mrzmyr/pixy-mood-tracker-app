import { Stack } from "expo-router";
import { View } from "react-native";
import { getCloseLabel } from "@/components/close-label";
import { HeaderButton } from "@/components/header-button";
import { getModalBarOptions } from "@/components/modal-bar-options";
import type { RouteModalHeaderProps } from "./route-modal-header";

/**
 * iOS: native sheet navigation bar. The root stack shows the header for the
 * route (`formModalOptions` in the app layout); this sets title and bar items.
 * Renders nothing in the screen body.
 *
 * Bar items are `HeaderButton`s, not `Stack.Toolbar` buttons: toolbar items
 * take no test ID, and e2e flows tap `tag-save`, `tag-cancel`, and others.
 */
const RouteModalHeader = ({
  title,
  onClose,
  closeTestID,
  back,
  titleView,
  confirm,
}: RouteModalHeaderProps) => (
  <>
    <Stack.Title>{title}</Stack.Title>
    <Stack.Screen
      options={{
        // Undefined keeps the `Stack.Title` text.
        headerTitle: titleView ? () => titleView : undefined,
        ...getModalBarOptions({
          left: (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <HeaderButton
                kind="cancel"
                label={getCloseLabel(Boolean(confirm))}
                onPress={onClose}
                testID={closeTestID}
              />
              {back ? <HeaderButton {...back} kind="back" /> : null}
            </View>
          ),
          right: confirm ? (
            <HeaderButton {...confirm} kind={confirm.kind ?? "confirm"} />
          ) : null,
        }),
      }}
    />
  </>
);

export default RouteModalHeader;
