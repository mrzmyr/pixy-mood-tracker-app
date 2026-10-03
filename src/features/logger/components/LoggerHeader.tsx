import type { RefObject } from "react";
import { View } from "react-native";
import type { CarouselRef } from "react-native-reanimated-carousel";
import { askToCancel, askToRemove } from "@/helpers/prompts";
import type { TemporaryLogValue } from "../temporaryLog";
import { SlideHeader } from "./SlideHeader";

/**
 * Logger stepper and header controls.
 * Closing a dirty log and deleting a log with message or tags ask for confirmation first.
 */
export const LoggerHeader = ({
  carouselRef,
  slideCount,
  slideIndex,
  isEditing,
  tempLog,
  onCancel,
  onRemove,
}: {
  carouselRef: RefObject<CarouselRef | null>;
  slideCount: number;
  slideIndex: number;
  isEditing: boolean;
  tempLog: TemporaryLogValue;
  onCancel: () => void;
  onRemove: () => void;
}) => (
  <View
    style={{
      paddingHorizontal: 20,
      paddingTop: 8,
    }}
  >
    <SlideHeader
      slideCount={slideCount}
      slideIndex={slideIndex}
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
