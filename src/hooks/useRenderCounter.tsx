import { useEffect, useRef } from "react";
import { StyleSheet, Text } from "react-native";

export const useRenderCounter = () => {
  const ref = useRef(0);

  useEffect(() => {
    ref.current = ref.current + 1;
  });
  
  return {
    count: ref.current,
    Counter: <Text style={styles.text}>{ref.current}</Text>
  };
}

const styles = StyleSheet.create({
  text: {
    paddingBottom: 10,
    textAlign: 'center',
    fontSize: 15,
    color: 'red',
  },
});