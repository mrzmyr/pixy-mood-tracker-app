import { useTheme } from "@react-navigation/native";

export default function useColors() {
  const { colors } = useTheme();
  return colors;
}
