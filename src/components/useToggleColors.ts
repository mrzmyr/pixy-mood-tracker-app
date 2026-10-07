import type { SwitchColors } from "@expo/ui/jetpack-compose";
import useColors from "@/hooks/useColors";

/**
 * Colors for the Android Material 3 switch ([Toggle.android.tsx](./Toggle.android.tsx)):
 * app tint when checked, app neutrals otherwise. Without them Compose uses the
 * Material You palette from the wallpaper (purple on a stock Pixel).
 */
const useToggleColors = (): SwitchColors => {
  const colors = useColors();
  return {
    checkedTrackColor: colors.tint,
    checkedBorderColor: colors.tint,
    checkedThumbColor: colors.toggleThumbChecked,
    uncheckedTrackColor: colors.toggleTrack,
    uncheckedBorderColor: colors.toggleOutline,
    uncheckedThumbColor: colors.toggleOutline,
    disabledCheckedTrackColor: colors.toggleDisabledCheckedTrack,
    disabledCheckedBorderColor: colors.toggleDisabledCheckedTrack,
    disabledCheckedThumbColor: colors.toggleDisabledCheckedThumb,
    disabledUncheckedTrackColor: colors.toggleDisabledTrack,
    disabledUncheckedBorderColor: colors.toggleDisabledOutline,
    disabledUncheckedThumbColor: colors.toggleDisabledOutline,
  };
};

export default useToggleColors;
