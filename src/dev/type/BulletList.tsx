import { Text, View } from "react-native";
import useColors from "@/hooks/useColors";
import { Gap } from "@/dev/type/chrome";
import { BULLET, TYPE } from "@/dev/type/scale";

/**
 * Body-reading list with a 6-point dot.
 * The dot is centered on the first line: `(lineHeight - dot) / 2`.
 */
export const BulletList = ({
  items,
  gap,
  measured = false,
}: {
  items: readonly string[];
  /** Space between items. The last item has none. */
  gap: number;
  /** Draw a {@link Gap} between items instead of a plain margin. */
  measured?: boolean;
}) => {
  const colors = useColors();
  const { lineHeight } = TYPE.bodyReading;

  return (
    <View>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <View key={item}>
            <View
              style={{
                alignItems: "flex-start",
                flexDirection: "row",
                marginBottom: isLast || measured ? 0 : gap,
              }}
            >
              <View
                style={{
                  backgroundColor: colors.textSecondary,
                  borderRadius: BULLET.size / 2,
                  height: BULLET.size,
                  marginRight: BULLET.gap,
                  marginTop: (lineHeight - BULLET.size) / 2,
                  width: BULLET.size,
                }}
              />
              <Text
                style={{
                  color: colors.text,
                  flex: 1,
                  fontSize: TYPE.bodyReading.fontSize,
                  fontWeight: TYPE.bodyReading.fontWeight,
                  letterSpacing: TYPE.bodyReading.letterSpacing,
                  lineHeight,
                }}
              >
                {item}
              </Text>
            </View>
            {!isLast && measured ? <Gap size={gap} /> : null}
          </View>
        );
      })}
    </View>
  );
};
