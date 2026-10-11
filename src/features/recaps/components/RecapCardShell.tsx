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
 * Frame of every recap card: art, module indicator, title, text, then the
 * family's actions.
 */
export const RecapCardShell = ({
  type,
  art,
  title,
  text,
  actions,
  onLayout,
}: {
  type: CardType;
  art?: ReactNode;
  title: string;
  text?: string;
  actions?: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
}) => {
  const colors = useColors();
  const { modules, family } = CARD_TYPES[type];

  return (
    <View onLayout={onLayout} testID={`recap-card-${type}`}>
      <Bezel
        radius={RADIUS.lg}
        innerStyle={{ padding: 20, backgroundColor: colors.cardBackground }}
      >
        {art && <View style={{ marginBottom: 20 }}>{art}</View>}
        <ModuleIndicator modules={modules} family={family} />
        <Title accessibilityRole="header" style={{ marginTop: 6 }}>
          {title}
        </Title>
        {text && <Secondary style={{ marginTop: 8 }}>{text}</Secondary>}
        {actions && <View style={{ marginTop: 20 }}>{actions}</View>}
      </Bezel>
    </View>
  );
};
