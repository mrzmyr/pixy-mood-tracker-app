import type { ReactNode } from "react";
import { View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Bezel from "@/components/Bezel";
import { Body, Title } from "@/components/Type";
import { BEZEL } from "@/constants/Bezel";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import { CARD_TYPES } from "../cardTypes";
import type { CardType } from "../types";
import { ModuleIndicator } from "./ModuleIndicator";

/** Inner padding of a recap card. */
const CARD_PADDING = 24;

/**
 * Frame of every recap card: art, module names, title, text, body, the
 * family's actions, then the footer (feedback) in the frame below the card.
 * Titles with inline chips pass the plain sentence as `titleLabel` for
 * screen readers.
 */
export const RecapCardShell = ({
  type,
  art,
  title,
  titleLabel,
  text,
  body,
  actions,
  footer,
  onLayout,
}: {
  type: CardType;
  art?: ReactNode;
  title: ReactNode;
  titleLabel?: string;
  text?: string;
  /** Lists and charts below the text. */
  body?: ReactNode;
  actions?: ReactNode;
  /** Muted row in the frame, below the card. */
  footer?: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
}) => {
  const colors = useColors();
  const { modules } = CARD_TYPES[type];

  return (
    <View onLayout={onLayout} testID={`recap-card-${type}`}>
      <Bezel
        radius={RADIUS.lg}
        innerStyle={{
          padding: CARD_PADDING,
          backgroundColor: colors.cardBackground,
        }}
        footer={
          footer ? (
            // Footer text starts where the card text starts.
            <View
              style={{ paddingHorizontal: CARD_PADDING + BEZEL.borderWidth }}
            >
              {footer}
            </View>
          ) : undefined
        }
      >
        {art && <View style={{ marginBottom: 24 }}>{art}</View>}
        <ModuleIndicator modules={modules} />
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel={titleLabel}
          style={{ marginTop: 8 }}
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
        {body && <View style={{ marginTop: 16 }}>{body}</View>}
        {actions && <View style={{ marginTop: 24 }}>{actions}</View>}
      </Bezel>
    </View>
  );
};
