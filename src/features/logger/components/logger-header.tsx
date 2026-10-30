import type { RefObject } from "react";
import type { CarouselRef } from "react-native-reanimated-carousel";
import RouteModalHeader from "@/components/route-modal-header";
import { askToCancel } from "@/lib/prompts";
import { useLogDraft } from "../log-draft";
import { Stepper } from "./stepper";

/** Side inset of slide text that lines up with the header icons. */
export const LOGGER_HEADER_ICON_INSET = 26;

/**
 * Logger bar: close leads, step dots as title. Back is the swipe, or the
 * `Back` accessibility action on the dots.
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

  const close = async () => {
    if (!isDirty) {
      onCancel();
      return;
    }
    try {
      await askToCancel();
      onCancel();
    } catch {
      // Keep editing when the user dismisses the prompt.
    }
  };

  return (
    <RouteModalHeader
      title=""
      onClose={() => {
        void close();
      }}
      closeTestID="logger-close"
      titleView={
        slideCount > 1 ? (
          <Stepper
            count={slideCount}
            index={slideIndex}
            onBack={
              slideIndex > 0 ? () => carouselRef.current?.prev() : undefined
            }
          />
        ) : undefined
      }
    />
  );
};
