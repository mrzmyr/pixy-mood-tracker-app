import { Image } from "expo-image";
import { Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import useColors from "@/hooks/use-colors";

const AvatarContent = ({
  size,
  photoUri,
  initials,
}: {
  size: number;
  photoUri: string | null;
  initials: string;
}) => {
  const colors = useColors();

  if (photoUri) {
    return (
      <Image
        source={{ uri: photoUri }}
        style={{ width: size, height: size }}
        contentFit="cover"
      />
    );
  }
  if (initials) {
    return (
      <Text
        numberOfLines={1}
        style={{
          fontSize: Math.round(size * 0.4),
          fontWeight: "600",
          color: colors.textSecondary,
        }}
      >
        {initials}
      </Text>
    );
  }
  // Head and shoulders, cut off by the round frame at the bottom.
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ position: "absolute", top: size * 0.08 }}
    >
      <Circle cx="12" cy="8.6" r="4.4" fill={colors.textSecondary} />
      <Path
        d="M2.6 24c0.9-5.6 4.6-8.8 9.4-8.8s8.5 3.2 9.4 8.8z"
        fill={colors.textSecondary}
      />
    </Svg>
  );
};

/**
 * Round avatar of the user. Photo when set, else initials on gray when a
 * name is set, else a gray person silhouette like iOS Contacts. Decorative:
 * the pressable around it carries the label.
 */
export const ProfileAvatar = ({
  size,
  photoUri,
  initials,
}: {
  size: number;
  photoUri: string | null;
  initials: string;
}) => {
  const colors = useColors();

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        backgroundColor: colors.backgroundSecondary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AvatarContent size={size} photoUri={photoUri} initials={initials} />
    </View>
  );
};
