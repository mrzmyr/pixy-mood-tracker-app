import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Dimensions, Text, View } from "react-native";
import { ArrowLeft, Moon } from "react-native-feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "@/components/LinkButton";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

/** Gradient header with back button for the month report. */
export const Header = ({
  title,
  subtitle,
  gradientColors,
}: {
  title: string;
  subtitle: string;
  gradientColors: [string, string, string];
}) => {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();

  return (
    <View
      style={{
        width: "100%",
        height: Dimensions.get("window").height * 0.25,
        paddingHorizontal: 20,
        paddingVertical: 24,
        paddingTop: insets.top + 24,
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
          top: "-80%",
        }}
      >
        <Moon
          width={600}
          height={600}
          fill={gradientColors[0]}
          color={gradientColors[0]}
        />
      </View>
      <View
        style={{
          justifyContent: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <LinkButton
            testID="statistics-back"
            accessibilityLabel={t("logger_back")}
            style={{}}
            onPress={() => {
              router.back();
            }}
          >
            <ArrowLeft width={24} height={24} color={colors.palette.white} />
          </LinkButton>
        </View>
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
