import { Keyboard, TouchableWithoutFeedback } from "react-native";

export default function DismissKeyboard({ children }) {
  return (
    <TouchableWithoutFeedback
      accessible={false}
      onPress={() => Keyboard.dismiss()}
    >
      {children}
    </TouchableWithoutFeedback>
  )
};
