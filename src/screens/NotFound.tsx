import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { RootStackScreenProps } from "../../types";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: "bold",
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: "#2e78b7",
  },
});

export const NotFoundScreen = ({
  navigation,
}: RootStackScreenProps<"NotFound">) => (
  <View style={styles.container}>
    <Text style={styles.title}>This screen doesn't exist.</Text>
    <TouchableOpacity
      onPress={() => navigation.replace("tabs")}
      style={styles.link}
    >
      <Text style={styles.linkText}>Go to home screen!</Text>
    </TouchableOpacity>
  </View>
);
