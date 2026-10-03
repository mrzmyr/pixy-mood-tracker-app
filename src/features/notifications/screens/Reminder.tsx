import Reminder from "../components/Reminder";
import { ScrollView, View } from "react-native";
import useColors from "@/hooks/useColors";

/** Settings > Reminder: daily reminder configuration. */
export const ReminderScreen = () => {
  const colors = useColors();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView
        style={{
          padding: 20,
        }}
      >
        <Reminder />
      </ScrollView>
    </View>
  );
};
