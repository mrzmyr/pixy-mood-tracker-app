import type { RefObject } from "react";
import { Keyboard } from "react-native";
import type { CarouselRef } from "react-native-reanimated-carousel";
import RouteModalHeader from "@/components/route-modal-header";
import { askToCancel } from "@/lib/prompts";
import { t } from "@/lib/translation";
import { useLogDraft } from "../log-draft";
import { Stepper } from "./stepper";

/** Side inset of slide text that lines up with the header icons. */
export const LOGGER_HEADER_ICON_INSET = 26;

/**
 * Logger bar: close leads, step dots as title. Back is the swipe, or the
 * `Back` accessibility action on the dots.
 * Closing a dirty log asks for confirmation first. A dirty log with more
 * than one slide also gets a trailing save, so the user can save from any
 * slide; the bottom button still moves to the next slide.
 */
export const LoggerHeader = ({
  carouselRef,
  slideCount,
  slideIndex,
  actions,
}: {
  carouselRef: RefObject<CarouselRef | null>;
  slideCount: number;
  slideIndex: number;
  /** Close without saving, and save the entry. */
  actions: { cancel: () => void; save: () => Promise<void> };
}) => {
  const { isDirty } = useLogDraft();

  const close = async () => {
    if (!isDirty) {
      actions.cancel();
      return;
    }
    try {
      await askToCancel();
      actions.cancel();
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
      confirm={
        isDirty && slideCount > 1
          ? {
              label: t("save"),
              onPress: () => {
                Keyboard.dismiss();
                void actions.save();
              },
              testID: "logger-header-save",
            }
          : undefined
      }
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
