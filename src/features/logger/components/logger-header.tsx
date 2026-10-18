import type { RefObject } from "react";
import { View } from "react-native";
import type { CarouselRef } from "react-native-reanimated-carousel";
import { askToCancel } from "@/lib/prompts";
import { useLogDraft } from "../log-draft";
import { SlideHeader } from "./slide-header";

/** Header padding. Keeps the 44pt header buttons near the screen edge. */
export const LOGGER_HEADER_INSET = 12;

/**
 * Visible edge of the back and close icons: half the gap between the 44pt
 * button and the 24pt icon, plus the icon's 4pt inner margin. Text without a
 * box of its own lines up with this edge.
 */
export const LOGGER_HEADER_ICON_INSET = LOGGER_HEADER_INSET + 10 + 4;

/**
 * Logger stepper and header controls.
 * Closing a dirty log asks for confirmation first.
 */
export const LoggerHeader = ({
  carouselRef,
  slideCount,
  slideIndex,
  onCancel,
}: {
  carouselRef: RefObject<CarouselRef | null>;
  slideCount: number;
  slideIndex: number;
  onCancel: () => void;
}) => {
  const { isDirty } = useLogDraft();

  return (
    <View
      style={{
        paddingHorizontal: LOGGER_HEADER_INSET,
        paddingTop: 12,
      }}
    >
      <SlideHeader
        slideCount={slideCount}
        slideIndex={slideIndex}
        onBack={() => {
          carouselRef.current?.prev();
        }}
        backVisible={slideIndex > 0}
        onClose={async () => {
          if (isDirty) {
            try {
              await askToCancel();
              onCancel();
            } catch {
              // Keep editing when the user dismisses the prompt.
            }
          } else {
            onCancel();
          }
        }}
      />
    </View>
  );
};
