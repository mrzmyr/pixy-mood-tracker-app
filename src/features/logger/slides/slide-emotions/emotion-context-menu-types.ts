import type { Emotion } from "@/types";
import type { ReactElement } from "react";

/** Props shared by the iOS context menu and the plain fallback. */
export interface EmotionContextMenuProps {
  emotion: Emotion;
  selected: boolean;
  onPress: (emotion: Emotion) => void;
  /** The emotion button. Keeps its own tap handling. */
  children: ReactElement;
}
