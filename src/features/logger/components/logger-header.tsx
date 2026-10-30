import type { RefObject } from "react";
import type { CarouselRef } from "react-native-reanimated-carousel";
import RouteModalHeader from "@/components/route-modal-header";
import { askToCancel } from "@/lib/prompts";
import { t } from "@/lib/translation";
import { useLogDraft } from "../log-draft";
import { Stepper } from "./stepper";

/** Side inset of slide text that lines up with the header icons. */
export const LOGGER_HEADER_ICON_INSET = 26;

/**
 * Logger bar: close leads, back follows from step 2, step dots as title.
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
      back={
        slideIndex > 0
          ? {
              label: t("logger_back"),
              onPress: () => carouselRef.current?.prev(),
              testID: "logger-back",
            }
          : undefined
      }
      titleView={
        slideCount > 1 ? (
          <Stepper count={slideCount} index={slideIndex} />
        ) : undefined
      }
    />
  );
};
