import isString from "lodash/isString";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import useColors from "@/hooks/useColors";
import { RADIUS } from "@/constants/Radius";

/**
 * Plain statistics card with a title and optional subtitle; unlike
 * `BigCard` it has no share action.
 */
export const Card = ({
  subtitle,
  title,
  children,
}: {
  subtitle?: string;
  title: string | ReactNode;
  children: ReactNode;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        paddingTop: 16,
        paddingBottom: 16,
        paddingLeft: 16,
        paddingRight: 16,
        borderRadius: RADIUS.md,
        backgroundColor: colors.cardBackground,
        marginTop: 16,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "bold",
            color: colors.statisticsCardSubtitle,
          }}
        >
          {subtitle}
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        {isString(title) ? (
          <Text
            style={{
              letterSpacing: -0.1,
              lineHeight: 24,
              fontSize: 17,
              fontWeight: "bold",
              color: colors.text,
            }}
          >
            {title}
          </Text>
        ) : (
          title
        )}
      </View>
      <View
        style={{
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {children}
      </View>
    </View>
  );
};
