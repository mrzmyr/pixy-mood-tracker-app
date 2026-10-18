import Reminder from "../components/Reminder";
import { View } from "react-native";
import useColors from "@/hooks/useColors";

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
