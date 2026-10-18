import Reminder from "../components/reminder";
import { View } from "react-native";
import useColors from "@/hooks/use-colors";

/** Settings > Reminder: daily reminder configuration. The list scrolls. */
export const ReminderScreen = () => {
  const colors = useColors();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <Reminder />
    </View>
  );
};
