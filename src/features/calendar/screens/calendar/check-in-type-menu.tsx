import type { ComponentType } from "react";
import { useCallback, useEffect, useEffectEvent, useState } from "react";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import {
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { FullWindowOverlay } from "react-native-screens";
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Moon from "lucide-react-native/icons/moon";
import Sunrise from "lucide-react-native/icons/sunrise";
import FlagHighlight from "@/components/flag-highlight";
import { Label } from "@/components/typography";
import { SHADOW } from "@/constants/shadow";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/feature-flags";
import type { CheckInType } from "@/types";
import { CalendarFloatButton } from "./calendar-float-button";
import { SIZE } from "./float-button-metrics";

/** Check-in types the menu offers. Quick check-in keeps its own button. */
type MenuCheckInType = Exclude<CheckInType, "quick">;

// Space between the add button and the lowest option, and between options.
const GAP = 12;
const OPTION_HEIGHT = 48;
// Options rise this far into place, like Material speed dial items.
const RISE = 16;
// Share of the open progress each option waits after the one below it.
const STAGGER = 0.12;

// Open: spring with little bounce, about 400 ms (emilkowal.ski/ui/great-animations).
const OPEN_SPRING = { duration: 400, dampingRatio: 0.85 };
// Close: fast accelerate, the menu leaves out of the way.
const CLOSE_TIMING = {
  duration: 180,
  easing: Easing.in(Easing.quad),
};

const OPTIONS: {
  type: MenuCheckInType;
  icon: ComponentType<{ width: number; height: number; color: string }>;
  label: () => string;
}[] = [
  {
    type: "morning_intention",
    icon: Sunrise,
    label: () => t("check_in_type_morning_intention"),
  },
  {
    type: "evening_reflection",
    icon: Moon,
    label: () => t("check_in_type_evening_reflection"),
  },
];

/**
 * One option. `order` 0 sits right above the add button and moves first.
 * Reduced motion: fades only.
 */
const MenuOption = ({
  type,
  icon: Icon,
  label,
  order,
  progress,
  onSelect,
}: (typeof OPTIONS)[number] & {
  order: number;
  progress: SharedValue<number>;
  onSelect: (type: MenuCheckInType) => void;
}) => {
  const colors = useColors();
  const isReducedMotion = useReducedMotion();
  const style = useAnimatedStyle(() => {
    const start = order * STAGGER;
    const local = interpolate(progress.get(), [start, 1], [0, 1], "clamp");
    return {
      opacity: local,
      transform: isReducedMotion
        ? []
        : [
            { translateY: (1 - local) * RISE },
            { scale: interpolate(local, [0, 1], [0.85, 1]) },
          ],
    };
  });

  return (
    <Animated.View style={[{ transformOrigin: "right" }, style]}>
      <Pressable
        testID={`check-in-type-${type}`}
        accessibilityRole="button"
        accessibilityLabel={label()}
        onPress={() => onSelect(type)}
        android_ripple={{
          color: "rgba(255, 255, 255, 0.24)",
          foreground: true,
        }}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          height: OPTION_HEIGHT,
          paddingHorizontal: 20,
          borderRadius: OPTION_HEIGHT / 2,
          overflow: "hidden",
          backgroundColor: colors.primaryButtonBackground,
          boxShadow: SHADOW.float,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Icon width={20} height={20} color={colors.primaryButtonText} />
        <Label
          size={16}
          strong
          numberOfLines={1}
          style={{ color: colors.primaryButtonText }}
        >
          {label()}
        </Label>
      </Pressable>
    </Animated.View>
  );
};

/**
 * Speed dial of the calendar add button. iOS draws it in a full-window
 * overlay, so the scrim also covers the native header with its glass
 * buttons. A copy of the add button sits on top of the real one and turns
 * into a close cross. Options rise from the button, lowest first. Closing
 * plays the motion backwards, then unmounts. Scrim tap, the cross, and
 * Android back close it.
 */
export const CheckInTypeMenu = ({
  isOpen,
  hasTodayEntry,
  onSelect,
  onClose,
}: {
  isOpen: boolean;
  hasTodayEntry: boolean;
  onSelect: (type: MenuCheckInType) => void;
  onClose: () => void;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const [isMounted, setIsMounted] = useState(isOpen);
  // Mount on open during render; unmount after the close motion ends.
  if (isOpen && !isMounted) {
    setIsMounted(true);
  }

  useEffect(() => {
    if (isOpen) {
      progress.set(withSpring(1, OPEN_SPRING));
      return;
    }
    progress.set(
      withTiming(
        0,
        // oxlint-disable-next-line pixy-standards/no-reduce-motion-never -- only fades and scales the menu away; reduced motion already drops the movement
        { ...CLOSE_TIMING, reduceMotion: ReduceMotion.Never },
        (finished) => {
          if (finished) {
            scheduleOnRN(setIsMounted, false);
          }
        }
      )
    );
  }, [isOpen, progress]);

  const closeOnBack = useEffectEvent(() => {
    onClose();
    return true;
  });
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      closeOnBack
    );
    return () => subscription.remove();
  }, [isOpen]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [0, 1], "clamp"),
  }));

  if (!isMounted) {
    return null;
  }

  const menu = (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
        <Pressable
          testID="check-in-type-menu-backdrop"
          accessibilityRole="button"
          accessibilityLabel={t("close")}
          onPress={onClose}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.checkInMenuBackdrop },
          ]}
        />
      </Animated.View>
      <View
        pointerEvents={isOpen ? "box-none" : "none"}
        style={{
          position: "absolute",
          right: 20,
          bottom: 20 + insets.bottom + SIZE + GAP,
        }}
      >
        <FlagHighlight flag="check-in-types">
          {/* Top to bottom; order 0 is the lowest option. */}
          <View style={{ alignItems: "flex-end", gap: GAP }}>
            {OPTIONS.map((option, index) => (
              <MenuOption
                key={option.type}
                {...option}
                order={OPTIONS.length - 1 - index}
                progress={progress}
                onSelect={onSelect}
              />
            ))}
          </View>
        </FlagHighlight>
      </View>
      <CalendarFloatButton
        isAtBottom
        isOpen={isOpen}
        hasTodayEntry={hasTodayEntry}
        onScrollToBottom={onClose}
        onAdd={onClose}
      />
    </View>
  );

  return Platform.OS === "ios" ? (
    <FullWindowOverlay>{menu}</FullWindowOverlay>
  ) : (
    menu
  );
};

/**
 * Open state of the check-in type menu and where each type goes. Without
 * flag `check-in-types`, `isEnabled` is false and + keeps opening the logger.
 * Both types open the logger with their type.
 */
export const useCheckInTypeMenu = ({
  hasTodayEntry,
}: {
  hasTodayEntry: boolean;
}) => {
  const router = useRouter();
  const analytics = useAnalytics();
  const isEnabled = useFeatureFlag("check-in-types");
  const [isOpen, setIsOpen] = useState(false);
  // Flag turned off while open: start closed when it turns on again.
  const [wasEnabled, setWasEnabled] = useState(isEnabled);
  if (wasEnabled !== isEnabled) {
    setWasEnabled(isEnabled);
    setIsOpen(false);
  }

  const handleClose = useCallback(() => setIsOpen(false), []);

  const toggle = () => {
    if (!isOpen) {
      analytics.track("calendar:check_in_menu_opened", {
        has_entries: hasTodayEntry,
      });
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (type: MenuCheckInType) => {
    setIsOpen(false);
    analytics.track("calendar:check_in_type_tapped", {
      check_in_type: type,
      has_entries: hasTodayEntry,
    });
    router.push({
      pathname: "/logs/create/[dateTime]",
      params: { dateTime: dayjs().toISOString(), checkInType: type },
    });
  };

  return {
    isEnabled,
    isOpen: isEnabled && isOpen,
    toggle,
    handleClose,
    handleSelect,
  };
};
