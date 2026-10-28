import {
  Button,
  ContextMenu,
  Host,
  RNHostView,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  font,
  foregroundStyle,
  frame,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import { t } from "@/lib/translation";
import type { EmotionContextMenuProps } from "./emotion-context-menu-types";

/** Preview card width. Fits a two-line description on the smallest iPhone. */
const PREVIEW_WIDTH = 300;

/**
 * Long press on an emotion on iOS: native context menu. The preview card
 * shows the emotion label and its description. One action selects or
 * deselects the emotion. A short tap still goes to the button.
 */
export const EmotionContextMenu = ({
  emotion,
  selected,
  onPress,
  children,
}: EmotionContextMenuProps) => (
  <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
    <ContextMenu>
      <ContextMenu.Trigger>
        <RNHostView matchContents={{ vertical: true }}>{children}</RNHostView>
      </ContextMenu.Trigger>
      <ContextMenu.Preview>
        <VStack
          alignment="leading"
          spacing={4}
          modifiers={[
            padding({ all: 16 }),
            frame({ width: PREVIEW_WIDTH, alignment: "leading" }),
          ]}
        >
          <Text modifiers={[font({ textStyle: "headline" })]}>
            {emotion.label}
          </Text>
          <Text
            modifiers={[
              font({ textStyle: "subheadline" }),
              foregroundStyle({ type: "hierarchical", style: "secondary" }),
            ]}
          >
            {emotion.description}
          </Text>
        </VStack>
      </ContextMenu.Preview>
      <ContextMenu.Items>
        <Button
          label={t(selected ? "log_emotions_deselect" : "log_emotions_select")}
          systemImage={selected ? "minus.circle" : "checkmark.circle"}
          onPress={() => onPress(emotion)}
        />
      </ContextMenu.Items>
    </ContextMenu>
  </Host>
);
