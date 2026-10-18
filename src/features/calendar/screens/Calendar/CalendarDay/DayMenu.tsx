import type { DayMenuProps } from "./dayMenuTypes";

/**
 * Calendar day long-press menu. Only iOS has one (`DayMenu.ios.tsx`):
 * Android and web keep the plain day, tap opens it.
 */
export const DayMenu = ({ children }: DayMenuProps) => children;
