import { Text } from "react-native";
import useColors from "@/hooks/useColors";

const TextInputLabel = ({ children }) => {
  const colors = useColors();

  return (
    <Text
      style={{
        fontSize: 17,
        color: colors.textInputLabel,
        marginTop: 16,
        marginBottom: 8,
        fontWeight: "bold",
      }}
    >
      {children}
    </Text>
  );
};

export default TextInputLabel;
