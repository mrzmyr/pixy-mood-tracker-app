import useColors from "@/hooks/use-colors";
import { useSettings } from "@/state/settings";
import { Pressable, View } from "react-native";
import X from "lucide-react-native/icons/x";
import Indicator from "@/components/indicator";
import { PressableScale } from "@/components/pressable-scale";
import { Heading } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import { t } from "@/lib/translation";

/**
 * Dismissible promo card on the calendar screen.
 *
 * Dismissal is stored as the `slug` action in settings, so each `slug` must
 * be unique and stable; once dismissed the card never shows again.
 */
export const PromoCard = ({
  subtitle,
  title,
  onPress,
  slug,
  colorName,
}: {
  subtitle: string;
  title: string;
  onPress: () => void;
  slug: string;
  colorName?: string;
}) => {
  const colors = useColors();
  const { addActionDone, hasActionDone } = useSettings();

  const _onPress = () => {
    onPress();
  };

  const onClose = () => {
    addActionDone(slug);
  };

  if (hasActionDone(slug)) {
    return null;
  }

  return (
    <PressableScale
      style={{
        backgroundColor: colors.promoCardBackground,
        borderRadius: RADIUS.md,
        borderCurve: "continuous",
        overflow: "hidden",
        paddingVertical: 16,
        paddingHorizontal: 16,
        minHeight: 140,
        borderColor: colors.promoCardBorder,
        borderWidth: 1,
      }}
      onPress={_onPress}
      accessibilityRole="button"
      // iOS groups the card into one element, which hides the close button.
      accessibilityActions={[{ name: "close", label: t("close") }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === "close") {
          onClose();
        }
      }}
    >
      <Indicator
        style={{
          position: "absolute",
          left: 16,
          top: 16,
        }}
        colorName={colorName || "purple"}
      >
        {subtitle}
      </Indicator>
      <Pressable
        style={{
          position: "absolute",
          height: 48,
          width: 48,
          right: 4,
          top: 4,
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1,
        }}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t("close")}
      >
        <X stroke={colors.promoCardText} width={24} height={24} />
      </Pressable>
      <View
        style={{
          flexDirection: "column",
          flex: 1,
          justifyContent: "flex-end",
        }}
      >
        <Heading
          size={20}
          style={{
            fontWeight: "bold",
            color: colors.promoCardText,
            marginTop: 8,
            lineHeight: 26,
          }}
        >
          {title}
        </Heading>
      </View>
    </PressableScale>
  );
};
