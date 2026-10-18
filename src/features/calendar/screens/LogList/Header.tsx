import { Stack } from "expo-router";
import { Platform } from "react-native";
import { CloseButton } from "@/components/CloseButton";
import { getCloseSlot } from "./closeSlot";

/**
 * Native stack header of the day entry list: the day as title and a close
 * button. The root stack shows the header for `days/[date]`.
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
    <CloseButton testID="log-list-close" onPress={onClose} />
  );

  return (
    <>
      <Stack.Title>{title}</Stack.Title>
      <Stack.Screen options={{ [getCloseSlot(Platform.OS)]: renderClose }} />
    </>
  );
};
