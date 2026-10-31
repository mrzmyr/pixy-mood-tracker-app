import type { ReactElement } from "react";
import { View } from "react-native";
import { HAS_FLOATING_HEADER } from "@/constants/floating-header";

/**
 * Custom bar items sit 9 pt further in than native bar buttons. Pull them
 * out so the circles line up with `Stack.Toolbar` buttons on other screens.
 */
const EDGE_OFFSET = -9;

const toItems = (element: ReactElement | null, side: "left" | "right") =>
  element
    ? [
        {
          type: "custom" as const,
          element: (
            <View
              style={
                side === "left"
                  ? { marginLeft: EDGE_OFFSET }
                  : { marginRight: EDGE_OFFSET }
              }
            >
              {element}
            </View>
          ),
          hidesSharedBackground: true,
        },
      ]
    : [];

/**
 * Native stack options that put modal header buttons in the bar, for modal
 * screens that keep the native bar: form sheets (feedback) and transparent
 * bars (check-in, day view). iOS 26:
 * custom items without the shared glass background, because `HeaderButton`
 * draws its own glass circle. Without this the bar wraps it in a second
 * capsule and clips it. Other platforms: plain `headerLeft` and `headerRight`.
 */
export const getModalBarOptions = ({
  left,
  right = null,
}: {
  left: ReactElement;
  right?: ReactElement | null;
}) =>
  HAS_FLOATING_HEADER
    ? {
        unstable_headerLeftItems: () => toItems(left, "left"),
        unstable_headerRightItems: () => toItems(right, "right"),
      }
    : { headerLeft: () => left, headerRight: () => right };
