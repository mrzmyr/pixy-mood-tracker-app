import { createContext } from "react";
import type { GestureResponderEvent } from "react-native";

/**
 * The player's tap and hold, for slide content that takes its own touches:
 * a tap still moves the story, a hold still pauses it. `null` outside the
 * player.
 */
export const StoryPressContext = createContext<{
  onPress: (event: GestureResponderEvent) => void;
  setIsHolding: (isHolding: boolean) => void;
} | null>(null);
