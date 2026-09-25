import { useEffect, useRef } from "react";
import { StyleSheet, Text } from "react-native";

const styles = StyleSheet.create({
  text: {
    paddingBottom: 10,
    textAlign: "center",
    fontSize: 15,
    color: "red",
  },
});

/**
 * Development aid that renders how often the host component rendered.
 *
 * The value lags by one render because it increments in an effect.
 */
export const useRenderCounter = () => {
  const ref = useRef(0);

  useEffect(() => {
    ref.current += 1;
  });

  // Debug-only helper: showing the render count requires reading the ref
  // during render; the displayed value is intentionally one render behind.
  return {
    // oxlint-disable-next-line react/refs -- debug helper exists to display a ref-held render count; state would re-render in a loop
    count: ref.current,
    // oxlint-disable-next-line react/refs -- debug helper displays the ref-held render count by design
    Counter: <Text style={styles.text}>{ref.current}</Text>,
  };
};
