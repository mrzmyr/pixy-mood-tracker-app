import { Keyboard, TouchableWithoutFeedback } from "react-native";

const DismissKeyboard = ({ children }) => (
  <TouchableWithoutFeedback
    accessible={false}
    onPress={() => Keyboard.dismiss()}
  >
    {children}
  </TouchableWithoutFeedback>
);

export default DismissKeyboard;
