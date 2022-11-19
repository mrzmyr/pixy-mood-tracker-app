import { StyleSheet, Text, View } from "react-native";
import { t } from "../../helpers/translation";
import useColors from "../../hooks/useColors";

export const NotEnoughDataOverlay = () => {
  const colors = useColors()

  return (
    <View style={styles.container}>
      <Text style={{
        ...styles.text,
        color: colors.text,
      }}>
        🎈{'\n'}
        {t('statistics_not_enough_data')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -16,
    left: -20,
    right: -20,
    bottom: -16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    zIndex: 999,
  },
  text: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
});