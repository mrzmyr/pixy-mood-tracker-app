import type { ReactNode } from "react";
import { View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Bezel from "@/components/Bezel";
import { Secondary, Title } from "@/components/Type";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import { CARD_TYPES } from "../cardTypes";
import type { CardType } from "../types";
import { ModuleIndicator } from "./ModuleIndicator";

/**
 * Frame of every recap card: art, module names, title, text, body, the
 * family's actions, then the footer (feedback). Titles with inline chips pass the
 * plain sentence as `titleLabel` for screen readers.
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
  footer?: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
}) => {
  const colors = useColors();
  const { modules } = CARD_TYPES[type];

  return (
    <View onLayout={onLayout} testID={`recap-card-${type}`}>
      <Bezel
        radius={RADIUS.lg}
        innerStyle={{ padding: 20, backgroundColor: colors.cardBackground }}
      >
        {art && <View style={{ marginBottom: 20 }}>{art}</View>}
        <ModuleIndicator modules={modules} />
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel={titleLabel}
          style={{ marginTop: 6 }}
        >
          <Title>{title}</Title>
        </View>
        {text && <Secondary style={{ marginTop: 8 }}>{text}</Secondary>}
        {body && <View style={{ marginTop: 16 }}>{body}</View>}
        {actions && <View style={{ marginTop: 20 }}>{actions}</View>}
      </Bezel>
      {footer}
    </View>
  );
};
