import { useRef } from "react";
import { Pressable } from "react-native";
import {
  Host,
  RNHostView,
  Text,
  TextButton,
  TooltipBox,
} from "@expo/ui/jetpack-compose";
import type { TooltipBoxRef } from "@expo/ui/jetpack-compose";
import Info from "lucide-react-native/icons/info";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { MATERIAL_SEED_COLOR } from "@/constants/colors";
import type { NeedInfoProps } from "./need-info-types";

/**
 * Info button after a need label on Android: Material 3 rich tooltip with a
 * title, the meaning, and "Got It". Opens on tap, stays until dismissed.
 *
 * Compose views must be direct children of a `Host`, so the tree is
 * `Host > TooltipBox > RNHostView > Pressable`.
 */
export const NeedInfo = ({
  title,
  description,
  met,
  unmet,
  testID,
}: NeedInfoProps) => {
  const colors = useColors();
  const tooltip = useRef<TooltipBoxRef>(null);
  const show = () => {
    void tooltip.current?.show();
  };
  const dismiss = () => {
    void tooltip.current?.dismiss();
  };

  return (
    <Host matchContents seedColor={MATERIAL_SEED_COLOR}>
      <TooltipBox ref={tooltip} isPersistent>
        <TooltipBox.RichTooltip>
          <TooltipBox.RichTooltip.Title>
            <Text>{title}</Text>
          </TooltipBox.RichTooltip.Title>
          <TooltipBox.RichTooltip.Text>
            <Text>
              {`${description}\n\n${t("log_needs_met")}: ${met.join(", ")}\n${t("log_needs_unmet")}: ${unmet.join(", ")}`}
            </Text>
          </TooltipBox.RichTooltip.Text>
          <TooltipBox.RichTooltip.Action>
            <TextButton onClick={dismiss}>
              <Text>{t("log_needs_got_it")}</Text>
            </TextButton>
          </TooltipBox.RichTooltip.Action>
        </TooltipBox.RichTooltip>
        <RNHostView matchContents>
          <Pressable
            testID={testID}
            accessibilityRole="button"
            accessibilityLabel={t("log_needs_about", { need: title })}
            hitSlop={12}
            onPress={show}
          >
            <Info size={18} color={colors.tint} />
          </Pressable>
        </RNHostView>
      </TooltipBox>
    </Host>
  );
};
