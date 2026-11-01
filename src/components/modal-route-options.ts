import { Platform } from "react-native";

/**
 * Stack options of every modal route ([Modals](../../DESIGN.md#components)).
 * iOS: native sheet bar in the screen background. The screen sets title and
 * bar items with `RouteModalHeader`. Android and web: no native bar,
 * `RouteModalHeader` draws the bar in the screen.
 */
export const getModalRouteOptions = ({
  textColor,
  backgroundColor,
}: {
  textColor: string;
  backgroundColor: string;
}) =>
  Platform.OS === "ios"
    ? {
        presentation: "modal" as const,
        headerShown: true,
        headerTintColor: textColor,
        headerShadowVisible: false,
        headerStyle: { backgroundColor },
        contentStyle: { backgroundColor },
      }
    : { presentation: "modal" as const, headerShown: false };
