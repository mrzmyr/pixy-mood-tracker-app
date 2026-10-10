import { EditActionButton } from "@/components/EditActionButton";
import { CloseButton } from "@/components/CloseButton";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { useFeedbackModal } from "@/features/feedback";
import { Pressable, View } from "react-native";
import { ArrowLeft, Trash } from "react-native-feather";
import { Stepper } from "./Stepper";

/**
 * Logger header with the back, close, and delete actions. The entry time
 * lives on the rating slide, see `SlideMoodFooter`.
 */
export const SlideHeader = ({
  isDeleteable,
  slideCount,
  slideIndex,
  backVisible,
  onBack,
  onClose,
  onDelete,
}: {
  isDeleteable: boolean;
  slideCount: number;
  slideIndex: number;
  backVisible?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  onDelete?: () => void;
}) => {
  const { Modal } = useFeedbackModal();
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        gap: 8,
      }}
    >
      <View
        style={{
          alignItems: "flex-start",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <Modal />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
            width: "100%",
          }}
        >
          {backVisible && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("logger_back")}
              testID="logger-back"
              onPress={() => {
                onBack?.();
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                height: 44,
                width: 44,
              })}
            >
              <ArrowLeft color={colors.logHeaderText} width={24} />
            </Pressable>
          )}
        </View>
      </View>
      {slideCount > 1 && <Stepper count={slideCount} index={slideIndex} />}
      <View
        style={{
          alignItems: "flex-end",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          {isDeleteable && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("delete")}
              testID="logger-delete"
              style={{
                height: 44,
                width: 44,
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={() => {
                onDelete?.();
              }}
            >
              <Trash color={colors.logHeaderText} width={24} height={24} />
            </Pressable>
          )}
          {isDeleteable ? (
            <EditActionButton
              action="cancel"
              label={t("cancel")}
              testID="logger-close"
              onPress={() => onClose?.()}
            />
          ) : (
            <CloseButton testID="logger-close" onPress={() => onClose?.()} />
          )}
        </View>
      </View>
    </View>
  );
};
