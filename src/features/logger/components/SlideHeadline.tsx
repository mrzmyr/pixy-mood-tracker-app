import { View } from "react-native";
import type { ViewStyle } from "react-native";

import { Section } from "@/components/Type";

const DEFAULT_STYLE = {};

/** Headline at the top of a logger slide. */
export const SlideHeadline = ({
  children,
  style = DEFAULT_STYLE,
}: {
  children: string;
  style?: ViewStyle;
}) => (
  <View
    style={{
      flexDirection: "row",
      ...style,
    }}
  >
    <Section>{children}</Section>
  </View>
);
