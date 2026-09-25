import { View } from "react-native";

/** Blank keypad cell that keeps the passcode pad grid aligned. */
export const PasscodeEmptyPad = () => (
  <View
    style={{
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      width: 80,
      height: 80,
    }}
  >
    <View
      style={{
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
      }}
    />
  </View>
);
