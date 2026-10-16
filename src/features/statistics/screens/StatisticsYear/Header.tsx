import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";
import { Star } from "react-native-feather";
import useColors from "@/hooks/useColors";

/** Gradient banner under the native header for the year report. */
export const Header = ({
  title,
  subtitle,
  gradientColors,
  bannerHeight,
  headerHeight,
}: {
  title: string;
  subtitle: string;
  gradientColors: [string, string, string];
  bannerHeight: number;
  headerHeight: number;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        width: "100%",
        height: bannerHeight,
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: headerHeight + 8,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <LinearGradient
        // Background Linear Gradient
        colors={gradientColors}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: "10%",
          top: "40%",
          transform: [{ rotate: "-40deg" }],
        }}
      >
        <Star
          width={500}
          height={500}
          fill={gradientColors[0]}
          color={gradientColors[0]}
        />
      </View>
      <View
        style={{
          justifyContent: "flex-end",
          flex: 1,
        }}
      >
        <Text
          style={{
            color: colors.palette.white,
            opacity: 0.5,
            fontSize: 17,
          }}
        >
          {subtitle}
        </Text>
        <Text
          accessibilityRole="header"
          style={{
            color: colors.palette.white,
            fontSize: 27,
            fontWeight: "bold",
            marginTop: 8,
          }}
        >
          {title}
        </Text>
      </View>
    </View>
  );
};
