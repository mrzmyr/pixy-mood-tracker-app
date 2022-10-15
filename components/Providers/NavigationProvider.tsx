import { NavigationContainer } from "@react-navigation/native";
import { useColorScheme } from "react-native";
import Colors from "../../constants/Colors";
import { NAVIGATION_LINKING } from "../../constants/Config";

export const NavigationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const scheme = useColorScheme();

  return (
    <NavigationContainer 
      linking={NAVIGATION_LINKING}
      theme={
        scheme === 'dark' ? { 
          dark: true,
          colors: Colors.dark,
        } : {
          dark: false,
          colors: Colors.light,
        }
      }
    >
      {children}
    </NavigationContainer>
  )
}