import { StyleSheet, View } from "react-native";
import { AlignLeft } from "react-native-feather";

const styles = StyleSheet.create({
  container: {
    opacity: 0.5,
  },
});

/** Message icon for calendar days. Not rendered anywhere at the moment. */
export const TextIndicator = ({ textColor }: { textColor: string }) => (
  <View style={styles.container}>
    <AlignLeft color={textColor} width={10} height={10} />
  </View>
);
