import { Stack } from "expo-router";
import { HeaderButton } from "@/components/header-button";
import { getCloseLabel } from "@/components/close-label";
import type { RouteModalHeaderProps } from "./route-modal-header";

/**
 * iOS: native sheet navigation bar. The root stack shows the header for the
 * route (`formModalOptions` in the app layout); this sets title and bar items.
 * Renders nothing in the screen body.
 *
 * Bar items are JS header items, not `Stack.Toolbar` buttons: toolbar items
 * take no test ID, and e2e flows tap `tag-save`, `tag-cancel`, and others.
 */
const RouteModalHeader = ({
  title,
  onClose,
  closeTestID,
  confirm,
}: RouteModalHeaderProps) => {
  const renderClose = () => (
    <HeaderButton
      kind="cancel"
      label={getCloseLabel(Boolean(confirm))}
      onPress={onClose}
      testID={closeTestID}
    />
  );
  const renderConfirm = () =>
    confirm ? (
      <HeaderButton {...confirm} kind={confirm.kind ?? "confirm"} />
    ) : null;

  return (
    <>
      <Stack.Title>{title}</Stack.Title>
      <Stack.Screen
        options={{ headerLeft: renderClose, headerRight: renderConfirm }}
      />
    </>
  );
};

export default RouteModalHeader;
