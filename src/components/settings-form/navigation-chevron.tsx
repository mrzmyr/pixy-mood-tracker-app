import { Image } from "@expo/ui/swift-ui";
import { font, foregroundStyle } from "@expo/ui/swift-ui/modifiers";

/** iOS trailing chevron of a navigation row. Android has none. */
const NavigationChevron = () => (
  <Image
    systemName="chevron.right"
    modifiers={[
      font({ size: 14, weight: "semibold" }),
      foregroundStyle({ type: "color", color: "tertiaryLabel" }),
    ]}
  />
);

export default NavigationChevron;
