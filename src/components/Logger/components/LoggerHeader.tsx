import type { RefObject } from "react";
import { View } from "react-native";
import type { CarouselRef } from "react-native-reanimated-carousel";
import { askToCancel, askToRemove } from "@/helpers/prompts";
import type { TemporaryLogValue } from "@/features/logs/temporaryLog";
import { SlideHeader } from "./SlideHeader";
import { Stepper } from "./Stepper";

/**
 * Logger stepper and header controls.
 * Closing a dirty log and deleting a log with message or tags ask for confirmation first.
 */
export const LoggerHeader = ({
  carouselRef,
  slideCount,
  slideIndex,
  setSlideIndex,
  isEditing,
  tempLog,
  onCancel,
  onRemove,
}: {
  carouselRef: RefObject<CarouselRef | null>;
  slideCount: number;
  slideIndex: number;
  setSlideIndex: (index: number) => void;
  isEditing: boolean;
  tempLog: TemporaryLogValue;
  onCancel: () => void;
  onRemove: () => void;
}) => (
  <View
    style={{
      paddingHorizontal: 20,
    }}
  >
    {slideCount > 1 ? (
      <Stepper
        count={slideCount}
        index={slideIndex}
        scrollTo={({ index }) => {
          if (carouselRef.current) {
            carouselRef.current.scrollTo({ index, animated: false });
          }
          setSlideIndex(index);
        }}
      />
    ) : (
      <View style={{ height: 24 }} />
    )}
    <SlideHeader
      onBack={() => {
        carouselRef.current?.prev();
      }}
      backVisible={slideIndex > 0}
      isDeleteable={isEditing}
      onClose={async () => {
        if (tempLog.isDirty) {
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
      onDelete={async () => {
        if (tempLog.data.message.length > 0 || tempLog.data.tags.length > 0) {
          await askToRemove();
        }
        onRemove();
      }}
    />
  </View>
);
