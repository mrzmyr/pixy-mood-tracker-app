import { Stack } from "expo-router";
import { HeaderButton } from "@/components/header-button";
import { getCloseLabel } from "@/components/close-label";

/**
 * Native stack header of the day entry list: the day as title and a close
 * button ([Modal Headers](../../../../../DESIGN.md#modal-headers)). The root
 * stack shows the header for `days/[date]`.
 *
 * Close is a JS header item, not a `Stack.Toolbar` button: toolbar items take
 * no test ID, and e2e flows tap `log-list-close`.
 */
export const Header = ({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) => {
  const renderClose = () => (
    <HeaderButton
      kind="cancel"
      label={getCloseLabel(false)}
      testID="log-list-close"
      onPress={onClose}
    />
  );

  return (
    <>
      <Stack.Title>{title}</Stack.Title>
      <Stack.Screen options={{ headerLeft: renderClose }} />
    </>
  );
};
