import { Stack } from "expo-router";
import { CloseButton } from "@/components/close-button";
import LinkButton from "@/components/link-button";
import { t } from "@/lib/translation";
import type { RouteModalHeaderProps } from "./route-modal-header";

/**
 * iOS: native sheet navigation bar. The root stack shows the header for the
 * route (`formModalOptions` in the app layout); this sets title and bar items.
 * Form with `action`: text Cancel left, action right. Other screens: close
 * button right. Renders nothing in the screen body.
 *
 * Bar items are JS header items, not `Stack.Toolbar` buttons: toolbar items
 * take no test ID, and e2e flows tap `tag-save`, `tag-cancel`, and others.
 */
const RouteModalHeader = ({
  title,
  onClose,
  closeTestID,
  action,
}: RouteModalHeaderProps) => {
  const renderCancel = () => (
    <LinkButton onPress={onClose} type="primary" testID={closeTestID}>
      {t("cancel")}
    </LinkButton>
  );
  const renderAction = () => action;
  const renderClose = () => (
    <CloseButton testID={closeTestID} onPress={onClose} />
  );

  return (
    <>
      <Stack.Title>{title}</Stack.Title>
      <Stack.Screen
        options={
          action
            ? { headerLeft: renderCancel, headerRight: renderAction }
            : { headerRight: renderClose }
        }
      />
    </>
  );
};

export default RouteModalHeader;
