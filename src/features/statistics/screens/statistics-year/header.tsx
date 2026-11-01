import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import Star from "lucide-react-native/icons/star";
import useColors from "@/hooks/use-colors";
import { Heading, Label } from "@/components/typography";

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
        <Label
          size={16}
          style={{
            color: colors.palette.white,
            opacity: 0.5,
          }}
        >
          {subtitle}
        </Label>
        <Heading
          size={24}
          accessibilityRole="header"
          style={{
            color: colors.palette.white,
            fontWeight: "bold",
            marginTop: 8,
          }}
        >
          {title}
        </Heading>
      </View>
    </View>
  );
};
