import { CloseButton } from "@/components/CloseButton";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { Pressable, View } from "react-native";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import { Stepper } from "./Stepper";

/**
 * Logger header with the back and close actions. The entry time lives on
 * the rating slide, see `SlideMoodFooter`. Entries are deleted from the day
 * view entry menu, not from the logger.
 */
export const SlideHeader = ({
  slideCount,
  slideIndex,
  backVisible,
  onBack,
  onClose,
}: {
  slideCount: number;
  slideIndex: number;
  backVisible?: boolean;
  onBack?: () => void;
  onClose?: () => void;
}) => {
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
          }}
        >
          <CloseButton testID="logger-close" onPress={() => onClose?.()} />
        </View>
      </View>
    </View>
  );
};
