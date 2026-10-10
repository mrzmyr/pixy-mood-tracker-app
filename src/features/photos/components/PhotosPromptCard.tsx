import { Text, View } from "react-native";
import Button from "@/components/Button";
import LinkButton from "@/components/LinkButton";
import useColors from "@/hooks/useColors";
import { RADIUS } from "@/constants/Radius";

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
                backgroundColor: colors.backgroundSecondary,
              }}
            />
          ))}
        </View>
      )}
      <Text
        accessibilityRole="header"
        style={{
          color: colors.text,
          fontSize: 17,
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 14,
          lineHeight: 20,
          textAlign: "center",
        }}
      >
        {body}
      </Text>
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
