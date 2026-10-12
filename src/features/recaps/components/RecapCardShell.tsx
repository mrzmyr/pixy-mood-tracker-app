import type { ReactNode } from "react";
import { View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { Body, Title } from "@/components/Type";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import type { CardType } from "../types";
import { CARD_PADDING } from "./rowLayout";

/**
 * Card of every recap: media flush with the top edge, art, title, text,
 * body, then the footer row (actions or feedback) on a muted strip. Titles
 * with inline chips pass the plain sentence as `titleLabel` for screen
 * readers.
 */
export const RecapCardShell = ({
  type,
  media,
  art,
  title,
  titleLabel,
  text,
  body,
  footer,
  onLayout,
}: {
  type: CardType;
  /** Full-bleed panel above the title: no padding to the card edges. */
  media?: ReactNode;
  /** Inset art above the title, such as an avatar. */
  art?: ReactNode;
  title: ReactNode;
  titleLabel?: string;
  text?: string;
  /** Lists and charts below the text. */
  body?: ReactNode;
  /** Row below a top border. Sets its own horizontal padding. */
  footer?: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
}) => {
  const colors = useColors();

  return (
    <View
      onLayout={onLayout}
      testID={`recap-card-${type}`}
      style={{
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: colors.recapCardBorder,
        backgroundColor: colors.cardBackground,
        boxShadow: colors.recapCardShadow,
      }}
    >
      {/* Clips media and footer to the rounded corners; the outer view keeps
          the shadow, which `overflow: hidden` would cut. */}
      <View style={{ borderRadius: RADIUS.md - 1, overflow: "hidden" }}>
        {media}
        <View style={{ padding: CARD_PADDING }}>
          {art && <View style={{ marginBottom: 24 }}>{art}</View>}
          <View
            accessible
            accessibilityRole="header"
            accessibilityLabel={titleLabel}
          >
            <Title style={{ letterSpacing: -0.25 }}>{title}</Title>
          </View>
          {text && (
            <Body
              style={{
                marginTop: 8,
                lineHeight: 24,
                color: colors.textSecondary,
              }}
            >
              {text}
            </Body>
          )}
          {body && <View style={{ marginTop: 24 }}>{body}</View>}
        </View>
        {footer && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.recapCardBorder,
              backgroundColor: colors.recapFooterBackground,
            }}
          >
            {footer}
          </View>
        )}
      </View>
    </View>
  );
};

/** Muted panel for media: flush with the card edges, padded inside. */
export const MediaPanel = ({
  children,
  minHeight,
}: {
  children: ReactNode;
  minHeight?: number;
}) => {
  const colors = useColors();
  return (
    <View
      style={{
        minHeight,
        justifyContent: "center",
        paddingVertical: 20,
        paddingHorizontal: CARD_PADDING,
        backgroundColor: colors.recapMutedBackground,
      }}
    >
      {children}
    </View>
  );
};
