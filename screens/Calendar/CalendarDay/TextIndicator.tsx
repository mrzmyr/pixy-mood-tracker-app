import { StyleSheet, View } from "react-native";
import { AlignLeft } from "react-native-feather";

export const TextIndicator = ({
  textColor,
}: {
  textColor: string;
}) => {
  return (
    <View style={styles.container}>
      <AlignLeft color={textColor} width={10} height={10} />
    </View>
  )
};

const styles = StyleSheet.create({
  container: {
    opacity: 0.5,
  }
})