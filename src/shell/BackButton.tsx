import { useRouter } from "expo-router";
import { Pressable } from "react-native";
import { ArrowLeft } from "react-native-feather";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";

/**
 * Header back button for web stack screens. iOS and Android use the native
 * back button.
 */
export const BackButton = ({
  testID,
  color,
}: {
  testID?: string;
  color?: string;
}) => {
  const router = useRouter();
  const colors = useColors();

  return (
    <Pressable
      style={{
        padding: 15,
        marginLeft: 5,
      }}
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel={t("back")}
      testID={testID}
    >
      <ArrowLeft width={24} color={color ?? colors.text} />
    </Pressable>
  );
};
