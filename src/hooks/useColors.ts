import { useTheme } from "@react-navigation/native";
import { IColors } from "@/constants/Colors";

export default function useColors(): IColors {
  const { colors } = useTheme() as any;
  return colors;
}
