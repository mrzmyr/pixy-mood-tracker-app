import { useState } from "react";
import { Button, Host, Popover, Text, VStack } from "@expo/ui/swift-ui";
import {
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  labelStyle,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import { t } from "@/lib/translation";
import type { NeedInfoProps } from "./need-info-types";

/** Popover width. Fits a two-line description on the smallest iPhone. */
const POPOVER_WIDTH = 280;

/**
 * Info button after a need label on iOS: native popover with an arrow at
 * the button, also on iPhone. Tap outside closes it.
 */
export const NeedInfo = ({
  title,
  description,
  met,
  unmet,
  testID,
}: NeedInfoProps) => {
  const [isPresented, setIsPresented] = useState(false);
  const secondary = foregroundStyle({
    type: "hierarchical",
    style: "secondary",
  });

  return (
    <Host matchContents testID={testID}>
      <Popover
        isPresented={isPresented}
        onIsPresentedChange={setIsPresented}
        arrowEdge="top"
      >
        <Popover.Trigger>
          <Button
            label={t("log_needs_about", { need: title })}
            systemImage="info.circle"
            onPress={() => setIsPresented(true)}
            modifiers={[labelStyle("iconOnly"), buttonStyle("borderless")]}
          />
        </Popover.Trigger>
        <Popover.Content>
          <VStack
            alignment="leading"
            spacing={6}
            modifiers={[
              padding({ all: 16 }),
              frame({ width: POPOVER_WIDTH, alignment: "leading" }),
            ]}
          >
            <Text modifiers={[font({ textStyle: "headline" })]}>{title}</Text>
            <Text modifiers={[font({ textStyle: "subheadline" })]}>
              {description}
            </Text>
            <Text modifiers={[font({ textStyle: "footnote" }), secondary]}>
              {`${t("log_needs_met")}: ${met.join(", ")}`}
            </Text>
            <Text modifiers={[font({ textStyle: "footnote" }), secondary]}>
              {`${t("log_needs_unmet")}: ${unmet.join(", ")}`}
            </Text>
          </VStack>
        </Popover.Content>
      </Popover>
    </Host>
  );
};
