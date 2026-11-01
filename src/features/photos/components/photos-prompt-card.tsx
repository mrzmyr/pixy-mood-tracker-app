import { View } from "react-native";
import Button from "@/components/button";
import LinkButton from "@/components/link-button";
import { Copy, Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { RADIUS } from "@/constants/radius";

const PREVIEW_TILES = 3;
const PREVIEW_GAP = 8;

/**
 * Card in the photos step for a state without photos: photo access not
 * asked yet, access off, no photos of the day, or nothing picked yet on
 * Android. `hasPreview` shows a row of empty tiles above the text, so the
 * user sees where photos will land.
 */
export const PhotosPromptCard = ({
  testID,
  title,
  body,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  hasPreview = false,
}: {
  testID: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  hasPreview?: boolean;
}) => {
  const colors = useColors();

  return (
    <View
      testID={testID}
      style={{
        alignItems: "center",
        gap: 8,
        padding: 16,
        borderRadius: RADIUS.lg,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.cardBorder,
        backgroundColor: colors.cardBackground,
      }}
    >
      {hasPreview && (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            flexDirection: "row",
            alignSelf: "stretch",
            gap: PREVIEW_GAP,
            marginBottom: 8,
          }}
        >
          {Array.from({ length: PREVIEW_TILES }, (_, index) => (
            <View
              key={index}
              style={{
                flex: 1,
                aspectRatio: 1,
                borderRadius: RADIUS.md,
                borderCurve: "continuous",
                backgroundColor: colors.backgroundSecondary,
              }}
            />
          ))}
        </View>
      )}
      <Label
        size={16}
        strong
        accessibilityRole="header"
        style={{ color: colors.text, textAlign: "center" }}
      >
        {title}
      </Label>
      <Copy
        size={14}
        style={{
          color: colors.textSecondary,
          lineHeight: 20,
          textAlign: "center",
        }}
      >
        {body}
      </Copy>
      {actionLabel !== undefined && onAction && (
        <Button
          testID={`${testID}-action`}
          onPress={onAction}
          style={{ marginTop: 4, paddingVertical: 10, paddingHorizontal: 20 }}
        >
          {actionLabel}
        </Button>
      )}
      {secondaryLabel !== undefined && onSecondary && (
        <LinkButton
          testID={`${testID}-secondary`}
          type="secondary"
          onPress={onSecondary}
          style={{ minHeight: 44, fontWeight: "400" }}
        >
          {secondaryLabel}
        </LinkButton>
      )}
    </View>
  );
};
