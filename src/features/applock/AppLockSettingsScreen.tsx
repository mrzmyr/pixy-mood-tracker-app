import { ScrollView, View } from "react-native";
import useColors from "@/hooks/useColors";
import { AppLockSetting } from "./AppLockSetting";

/** Settings > App Lock. */
export const AppLockSettingsScreen = () => {
  const colors = useColors();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ padding: 20 }}>
        <AppLockSetting />
      </ScrollView>
    </View>
  );
};
