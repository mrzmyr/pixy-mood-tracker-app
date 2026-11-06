import { View } from "react-native";
import type { ViewStyle } from "react-native";

import { Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { SPACE } from "@/constants/space";

const DEFAULT_STYLE = {};

/**
 * Header of a `SheetModal`: `left` and `right` take `HeaderButton`. No divider
 * and no background: the bar shows the sheet surface.
 */
const ModalHeader = ({
  title = "",
  right = null,
  left = null,
  style = DEFAULT_STYLE,
  titleView,
}: {
  title?: string;
  /** Shown instead of the title text. */
  titleView?: React.ReactNode;
  right?: React.ReactNode;
  left?: React.ReactNode;
  style?: ViewStyle;
}) => {
  const colors = useColors();

  return (
    <View
      style={[
        {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: SPACE.sm,
          paddingLeft: SPACE.sm,
          paddingRight: SPACE.sm,
          paddingBottom: SPACE.sm,
        },
        style,
      ]}
    >
      <View
        style={{
          justifyContent: "flex-start",
          flexDirection: "row",
          width: "30%",
        }}
      >
        {left || null}
      </View>
      <View
        style={{
          justifyContent: "center",
          flexDirection: "row",
          width: "40%",
        }}
      >
        {titleView ?? (
          <Label
            size={16}
            strong
            numberOfLines={1}
            ellipsizeMode="middle"
            style={{
              color: colors.text,
              width: "100%",
              textAlign: "center",
            }}
          >
            {title}
          </Label>
        )}
      </View>
      <View
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          flexDirection: "row",
          width: "30%",
        }}
      >
        {right}
      </View>
    </View>
  );
};

export default ModalHeader;
