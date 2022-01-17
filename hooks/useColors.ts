import Colors from "../constants/Colors";
import useColorScheme from "./useColorScheme"

export default function useColors() {
  const colorScheme = useColorScheme()
  return Colors[colorScheme];
}
