import { useNavigation } from "@react-navigation/native";
import { Pressable } from "react-native";
import { ArrowLeft } from "react-native-feather";
import useColors from "@/hooks/useColors";

/**
 * Header back button for Android and web stack screens; iOS uses the native
 * back button.
 */
export const BackButton = ({ testID }: { testID?: string }) => {
  const navigation = useNavigation();
  const colors = useColors();

  return (
    <Pressable
      style={{
        padding: 15,
        marginLeft: 5,
      }}
      onPress={() => navigation.goBack()}
      testID={testID}
    >
      <ArrowLeft width={24} color={colors.text} />
    </Pressable>
  );
};
