import { View } from "react-native";
import type { ItemMenuProps } from "./itemMenuTypes";

/**
 * Long-press menu around a tag or person. iOS shows the system context menu
 * (`ItemMenu.ios.tsx`); elsewhere the item opens its editor on a long press
 * (`useItemMenuPressProps`).
 */
export const ItemMenu = ({ style, children }: ItemMenuProps) => (
  <View style={style}>{children}</View>
);
